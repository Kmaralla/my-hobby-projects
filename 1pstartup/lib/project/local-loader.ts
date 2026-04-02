import fs from "fs";
import path from "path";
import type { Mode } from "@/lib/types";
import type { ProjectFile } from "./types";
import { ROLE_FILE_MANIFESTS, ROLE_TOKEN_BUDGETS, BINARY_EXTENSIONS } from "./manifests";
import { selectFilesWithinBudget, estimateTokens } from "./token-budget";

function isBinary(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  const parts = filePath.split(path.sep);
  return excludePatterns.some((pat) =>
    parts.some((part) => part === pat || part.startsWith(pat.replace("*", "")))
  );
}

function matchesGlob(filePath: string, pattern: string): boolean {
  // Simple glob: support ** and * wildcards
  const normalized = filePath.replace(/\\/g, "/");
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "§§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§§/g, ".*");
  return new RegExp(`^${regexStr}$`).test(normalized);
}

export function walkDirectory(
  rootPath: string,
  maxDepth = 4,
  currentDepth = 0,
  relative = ""
): string[] {
  if (currentDepth > maxDepth) return [];
  const entries: string[] = [];
  try {
    const items = fs.readdirSync(rootPath);
    for (const item of items) {
      if (item.startsWith(".") && currentDepth === 0) continue; // skip hidden at root
      const fullPath = path.join(rootPath, item);
      const relPath = relative ? `${relative}/${item}` : item;
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          // Skip obvious noise dirs at any depth
          if (["node_modules", ".git", "dist", "build", ".next", "__pycache__", ".venv"].includes(item)) continue;
          entries.push(...walkDirectory(fullPath, maxDepth, currentDepth + 1, relPath));
        } else if (stat.isFile() && stat.size < 500_000) {
          entries.push(relPath);
        }
      } catch {
        // skip unreadable entries
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return entries;
}

export function buildDirectoryTree(rootPath: string, maxDepth = 2): string {
  function buildTree(dir: string, depth: number, prefix: string): string {
    if (depth > maxDepth) return "";
    let result = "";
    try {
      const items = fs.readdirSync(dir).filter((i) => !["node_modules", ".git", "dist", "build", ".next"].includes(i));
      items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        const connector = isLast ? "└── " : "├── ";
        const fullPath = path.join(dir, item);
        try {
          const stat = fs.statSync(fullPath);
          result += `${prefix}${connector}${item}\n`;
          if (stat.isDirectory() && depth < maxDepth) {
            result += buildTree(fullPath, depth + 1, prefix + (isLast ? "    " : "│   "));
          }
        } catch { /* skip */ }
      });
    } catch { /* skip */ }
    return result;
  }
  const projectName = path.basename(rootPath);
  return `${projectName}/\n${buildTree(rootPath, 0, "")}`;
}

export async function loadLocalProject(projectPath: string, mode: Mode): Promise<{
  files: ProjectFile[];
  directoryTree: string;
  projectName: string;
}> {
  const manifest = ROLE_FILE_MANIFESTS[mode];
  const tokenBudget = ROLE_TOKEN_BUDGETS[mode];

  if (!fs.existsSync(projectPath)) throw new Error(`Path does not exist: ${projectPath}`);
  const stat = fs.statSync(projectPath);
  if (!stat.isDirectory()) throw new Error(`Path is not a directory: ${projectPath}`);

  const projectName = path.basename(projectPath);
  const directoryTree = buildDirectoryTree(projectPath);
  const allFiles = walkDirectory(projectPath);

  const candidates: Array<{ path: string; content: string; priority: number }> = [];

  for (const relPath of allFiles) {
    if (isBinary(relPath)) continue;
    if (shouldExclude(relPath, manifest.excludePatterns)) continue;

    const fullPath = path.join(projectPath, relPath);
    const normalized = relPath.replace(/\\/g, "/");

    // Determine priority
    const priorityIdx = manifest.priorityFiles.findIndex(
      (pf) => normalized === pf || normalized.toLowerCase() === pf.toLowerCase() || normalized.endsWith(`/${pf}`)
    );
    const patternMatch = manifest.patterns.some((p) => matchesGlob(normalized, p));

    if (priorityIdx === -1 && !patternMatch) continue;

    const priority = priorityIdx >= 0 ? 1000 - priorityIdx : 10;

    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      if (!content.trim()) continue;
      // Quick binary check
      if (content.slice(0, 512).includes("\0")) continue;
      candidates.push({ path: normalized, content, priority });
    } catch { /* skip unreadable */ }
  }

  const files = selectFilesWithinBudget(candidates, tokenBudget, manifest.perFileTokenLimit);

  return { files, directoryTree, projectName };
}
