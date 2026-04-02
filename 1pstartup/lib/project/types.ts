import type { Mode } from "@/lib/types";

export type ProjectSourceType = "local" | "github";

export interface LocalProjectSource {
  type: "local";
  path: string;
}

export interface GitHubProjectSource {
  type: "github";
  owner: string;
  repo: string;
  branch: string;
  token?: string;
}

export type ProjectSource = LocalProjectSource | GitHubProjectSource;

export interface ProjectFile {
  path: string;
  content: string;
  tokenEstimate: number;
  truncated: boolean;
}

export interface ProjectContext {
  source: ProjectSource;
  projectName: string;
  loadedAt: number;
  mode: Mode;
  files: ProjectFile[];
  totalTokenEstimate: number;
  directoryTree: string;
  summary: string;
}

export interface RoleFileManifest {
  priorityFiles: string[];
  patterns: string[];
  excludePatterns: string[];
  maxFilesPerPattern: number;
  perFileTokenLimit: number;
}

export interface ProjectLoadResult {
  success: boolean;
  projectContext?: ProjectContext;
  error?: string;
}
