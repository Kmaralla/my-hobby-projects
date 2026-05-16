export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  branch: string;
  path?: string;
}

function stripGitSuffix(value: string): string {
  return value.replace(/\.git$/i, "");
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseGitHubUrl(input: string): ParsedGitHubUrl | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let pathPart = trimmed;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return null;
    pathPart = url.pathname;
  } catch {
    pathPart = trimmed
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/^github\.com\//i, "")
      .replace(/^www\.github\.com\//i, "");
  }

  const parts = pathPart
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .filter(Boolean)
    .map((part) => safeDecodeURIComponent(part));

  if (parts.length < 2) return null;

  const [owner, rawRepo, view, branch, ...pathParts] = parts;
  const repo = stripGitSuffix(rawRepo);
  if (!owner || !repo) return null;

  if ((view === "tree" || view === "blob") && branch) {
    return {
      owner,
      repo,
      branch,
      path: pathParts.length > 0 ? pathParts.join("/") : undefined,
    };
  }

  return { owner, repo, branch: "" };
}
