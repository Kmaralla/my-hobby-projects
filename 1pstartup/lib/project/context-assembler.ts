import type { Mode } from "@/lib/types";
import type { ProjectFile, ProjectSource } from "./types";
import { estimateTokens } from "./token-budget";

const ROLE_LENS_LABEL: Record<Mode, string> = {
  founder: "Founder lens — business context, product direction, roadmap",
  dev: "Dev lens — source code, architecture, configuration",
  "qa-eng": "QA lens — tests, CI/CD, quality coverage",
  sales: "Sales lens — product docs, README, positioning",
};

function getFileLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", go: "go", rs: "rust", rb: "ruby", java: "java",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", mdx: "markdown", sh: "bash", dockerfile: "dockerfile",
    css: "css", html: "html", sql: "sql",
  };
  return map[ext] ?? ext;
}

export function assembleProjectContext(
  files: ProjectFile[],
  directoryTree: string,
  source: ProjectSource,
  mode: Mode,
  projectName: string
): string {
  const totalTokens = files.reduce((sum, f) => sum + f.tokenEstimate, 0);
  const sourceLabel = source.type === "local"
    ? `Local — ${source.path}`
    : `GitHub — ${source.owner}/${source.repo} (${source.branch})`;

  const header = [
    `## Project: ${projectName}`,
    `Source: ${sourceLabel}`,
    `Files loaded: ${files.length} | ~${(totalTokens / 1000).toFixed(1)}k tokens`,
    `Role lens: ${ROLE_LENS_LABEL[mode]}`,
  ].join("\n");

  const treeSection = `### Directory Structure\n\`\`\`\n${directoryTree}\n\`\`\``;

  const fileSections = files.map((f) => {
    const lang = getFileLanguage(f.path);
    const truncNote = f.truncated ? "\n// [...file truncated...]" : "";
    return `### ${f.path}\n\`\`\`${lang}\n${f.content}${truncNote}\n\`\`\``;
  }).join("\n\n");

  return `<project_context>\n${header}\n\n${treeSection}\n\n${fileSections}\n</project_context>`;
}
