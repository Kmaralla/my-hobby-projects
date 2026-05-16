import type { Mode } from "@/lib/types";
import type { ProjectFile } from "./types";
import { ROLE_FILE_MANIFESTS, ROLE_TOKEN_BUDGETS, BINARY_EXTENSIONS } from "./manifests";
import { selectFilesWithinBudget } from "./token-budget";
import { parseGitHubUrl } from "./github-url";
import path from "path";

const GITHUB_API = "https://api.github.com";

function makeHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export function parseGitHubInput(input: string): { owner: string; repo: string } | null {
  const parsed = parseGitHubUrl(input);
  return parsed ? { owner: parsed.owner, repo: parsed.repo } : null;
}

function normalizeRepoPath(repoPath?: string): string {
  return (repoPath ?? "").replace(/^\/+|\/+$/g, "");
}

async function getDefaultBranch(owner: string, repo: string, token?: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: makeHeaders(token),
  });
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        token
          ? `GitHub could not find "${owner}/${repo}". Check the repo URL and that your token has access.`
          : `GitHub could not find "${owner}/${repo}". Check the repo URL. If the repo is private, add a GitHub token.`
      );
    }
    if (res.status === 401) {
      throw new Error("Invalid GitHub token. Generate one at github.com/settings/tokens with repo scope.");
    }
    if (res.status === 403) {
      throw new Error("GitHub API rate limit reached. Please try again later, or add a GitHub token to raise the rate limit.");
    }
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `GitHub API error: ${res.status}`);
  }
  const data = await res.json() as { default_branch: string };
  return data.default_branch || "main";
}

interface TreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
}

async function getRepoTree(owner: string, repo: string, branch: string, token?: string): Promise<TreeEntry[]> {
  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: makeHeaders(token) }
  );
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`Branch or ref "${branch}" was not found in ${owner}/${repo}. Check the GitHub URL branch and folder path.`);
    }
    if (res.status === 401) {
      throw new Error("Invalid GitHub token. Generate one at github.com/settings/tokens with repo scope.");
    }
    if (res.status === 403) {
      throw new Error("GitHub API rate limit reached. Please try again later, or add a GitHub token to raise the rate limit.");
    }
    throw new Error(`Failed to fetch repo tree from GitHub: ${res.status}`);
  }
  const data = await res.json() as { tree: TreeEntry[]; truncated: boolean };
  return data.tree.filter((e) => e.type === "blob");
}

async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string,
  branch: string,
  token?: string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`,
      { headers: makeHeaders(token) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { content?: string; encoding?: string; download_url?: string };

    if (data.encoding === "base64" && data.content) {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
    }
    if (data.download_url) {
      const raw = await fetch(data.download_url);
      return raw.ok ? await raw.text() : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchInBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize = 5
): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    results.push(...await Promise.all(batch.map((t) => t())));
  }
  return results;
}

function isBinaryPath(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

function matchesGlob(filePath: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "§§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§§/g, ".*");
  return new RegExp(`^${regexStr}$`).test(filePath);
}

function shouldExclude(filePath: string, excludePatterns: string[]): boolean {
  const parts = filePath.split("/");
  return excludePatterns.some((pat) =>
    parts.some((part) => part === pat || part.startsWith(pat.replace("*", "")))
  );
}

export async function loadGitHubProject(
  owner: string,
  repo: string,
  branch: string,
  mode: Mode,
  token?: string,
  repoPath?: string
): Promise<{ files: ProjectFile[]; directoryTree: string; resolvedBranch: string }> {
  const manifest = ROLE_FILE_MANIFESTS[mode];
  const tokenBudget = ROLE_TOKEN_BUDGETS[mode];
  const rootPath = normalizeRepoPath(repoPath);

  // Resolve branch if empty
  const resolvedBranch = branch || await getDefaultBranch(owner, repo, token);

  // Get full file tree
  const fullTree = await getRepoTree(owner, repo, resolvedBranch, token);
  const tree = rootPath
    ? fullTree
        .filter((e) => e.path === rootPath || e.path.startsWith(`${rootPath}/`))
        .map((e) => ({ ...e, path: e.path.slice(rootPath.length).replace(/^\//, "") }))
        .filter((e) => e.path.length > 0)
    : fullTree;

  if (rootPath && tree.length === 0) {
    throw new Error(`Path "${rootPath}" was not found in ${owner}/${repo} on branch "${resolvedBranch}".`);
  }

  // Build a simple directory tree (top 2 levels)
  const dirs = new Set<string>();
  tree.forEach((e) => {
    const parts = e.path.split("/");
    if (parts.length > 1) dirs.add(parts[0]);
  });
  const rootLabel = rootPath ? `${repo}/${rootPath}` : repo;
  const directoryTree = `${rootLabel}/\n${[...dirs].slice(0, 30).map((d) => `├── ${d}/`).join("\n")}\n${tree.filter((e) => !e.path.includes("/")).slice(0, 20).map((e) => `├── ${e.path}`).join("\n")}`;

  // Score and filter files
  const scored: Array<{ path: string; priority: number; size: number }> = [];

  for (const entry of tree) {
    if (isBinaryPath(entry.path)) continue;
    if (shouldExclude(entry.path, manifest.excludePatterns)) continue;
    if ((entry.size ?? 0) > 400_000) continue;

    const priorityIdx = manifest.priorityFiles.findIndex(
      (pf) => entry.path === pf || entry.path.toLowerCase() === pf.toLowerCase() || entry.path.endsWith(`/${pf}`)
    );
    const patternMatch = manifest.patterns.some((p) => matchesGlob(entry.path, p));

    if (priorityIdx === -1 && !patternMatch) continue;

    const priority = priorityIdx >= 0 ? 1000 - priorityIdx : 10;
    scored.push({ path: entry.path, priority, size: entry.size ?? 0 });
  }

  // Sort by priority, take top N to avoid too many API calls
  scored.sort((a, b) => b.priority - a.priority);
  const toFetch = scored.slice(0, 60); // max 60 files fetched

  // Fetch contents in batches
  const fetchTasks = toFetch.map((f) => async () => {
    const fetchPath = rootPath ? `${rootPath}/${f.path}` : f.path;
    const content = await fetchFileContent(owner, repo, fetchPath, resolvedBranch, token);
    return { path: f.path, content, priority: f.priority };
  });

  const fetched = await fetchInBatches(fetchTasks, 5);
  const candidates = fetched
    .filter((f): f is { path: string; content: string; priority: number } => !!f.content?.trim());

  const files = selectFilesWithinBudget(candidates, tokenBudget, manifest.perFileTokenLimit);

  return { files, directoryTree, resolvedBranch };
}
