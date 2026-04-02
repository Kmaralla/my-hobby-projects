import type { ProjectFile } from "./types";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateToTokenBudget(
  content: string,
  maxTokens: number
): { content: string; truncated: boolean } {
  const maxChars = maxTokens * 4;
  if (content.length <= maxChars) return { content, truncated: false };
  // For code files: keep top (imports/types) + truncate body
  const truncated = content.slice(0, maxChars);
  return { content: truncated + "\n\n// [...truncated to fit token budget...]", truncated: true };
}

export function selectFilesWithinBudget(
  candidates: Array<{ path: string; content: string; priority: number }>,
  totalBudget: number,
  perFileLimit: number
): ProjectFile[] {
  // Sort by priority descending (higher = more important)
  const sorted = [...candidates].sort((a, b) => b.priority - a.priority);
  const result: ProjectFile[] = [];
  let remaining = totalBudget;

  for (const candidate of sorted) {
    if (remaining <= 0) break;
    const { content, truncated } = truncateToTokenBudget(candidate.content, Math.min(perFileLimit, remaining));
    const tokenEstimate = estimateTokens(content);
    result.push({ path: candidate.path, content, tokenEstimate, truncated });
    remaining -= tokenEstimate;
  }

  return result;
}
