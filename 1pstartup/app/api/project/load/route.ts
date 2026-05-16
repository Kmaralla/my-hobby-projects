import { MODES, type Mode } from "@/lib/types";
import type { ProjectSource, ProjectLoadResult } from "@/lib/project/types";
import { loadLocalProject } from "@/lib/project/local-loader";
import { loadGitHubProject, loadGitHubProjectForModes } from "@/lib/project/github-loader";
import { parseGitHubUrl } from "@/lib/project/github-url";
import { assembleProjectContext } from "@/lib/project/context-assembler";
import { estimateTokens } from "@/lib/project/token-budget";

function normalizeGitHubSource(source: Extract<ProjectSource, { type: "github" }>) {
  if (!source.url) return source;
  const parsed = parseGitHubUrl(source.url);
  if (!parsed) return source;
  return {
    ...source,
    owner: parsed.owner,
    repo: parsed.repo,
    branch: parsed.branch || source.branch,
    path: parsed.path,
  };
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { source, mode, allModes } = (await req.json()) as { source: ProjectSource; mode: Mode; allModes?: boolean };
    const modesToLoad = allModes ? MODES.map((m) => m.id) : [mode];

    if (allModes) {
      const projectContexts: Partial<Record<Mode, NonNullable<ProjectLoadResult["projectContext"]>>> = {};

      if (source.type === "local") {
        if (process.env.VERCEL) {
          throw new Error("Local path loading is not available in the deployed version. Use a GitHub URL instead.");
        }
        for (const targetMode of modesToLoad) {
          const result = await loadLocalProject(source.path, targetMode);
          const summary = assembleProjectContext(result.files, result.directoryTree, source, targetMode, result.projectName);
          projectContexts[targetMode] = {
            source,
            projectName: result.projectName,
            loadedAt: Date.now(),
            mode: targetMode,
            files: result.files,
            totalTokenEstimate: estimateTokens(summary),
            directoryTree: result.directoryTree,
            summary,
          };
        }
      } else {
        const githubSource = normalizeGitHubSource(source);
        if (!githubSource.url && (githubSource.branch === "tree" || githubSource.branch === "blob")) {
          throw new Error("Saved GitHub project URL looks stale from an older parser. Reconnect the full GitHub URL once to refresh it.");
        }
        const results = await loadGitHubProjectForModes(
          githubSource.owner,
          githubSource.repo,
          githubSource.branch,
          modesToLoad,
          githubSource.token,
          githubSource.path
        );
        for (const targetMode of modesToLoad) {
          const result = results[targetMode];
          const modeSource = { ...githubSource, branch: result.resolvedBranch };
          const projectName = githubSource.path ? `${githubSource.repo}/${githubSource.path}` : githubSource.repo;
          const summary = assembleProjectContext(result.files, result.directoryTree, modeSource, targetMode, projectName);
          projectContexts[targetMode] = {
            source: modeSource,
            projectName,
            loadedAt: Date.now(),
            mode: targetMode,
            files: result.files,
            totalTokenEstimate: estimateTokens(summary),
            directoryTree: result.directoryTree,
            summary,
          };
        }
      }

      return Response.json({
        success: true,
        projectContext: projectContexts[mode],
        projectContexts,
      } satisfies ProjectLoadResult);
    }

    let files, directoryTree, projectName: string;

    if (source.type === "local") {
      // Local filesystem access is only available when running locally
      if (process.env.VERCEL) {
        throw new Error("Local path loading is not available in the deployed version. Use a GitHub URL instead.");
      }
      const result = await loadLocalProject(source.path, mode);
      files = result.files;
      directoryTree = result.directoryTree;
      projectName = result.projectName;
    } else {
      const githubSource = normalizeGitHubSource(source);
      if (!githubSource.url && (githubSource.branch === "tree" || githubSource.branch === "blob")) {
        throw new Error("Saved GitHub project URL looks stale from an older parser. Reconnect the full GitHub URL once to refresh it.");
      }
      const result = await loadGitHubProject(
        githubSource.owner, githubSource.repo, githubSource.branch, mode, githubSource.token, githubSource.path
      );
      files = result.files;
      directoryTree = result.directoryTree;
      projectName = githubSource.path ? `${githubSource.repo}/${githubSource.path}` : githubSource.repo;
      // Update branch with resolved value
      githubSource.branch = result.resolvedBranch;
      Object.assign(source, githubSource);
    }

    const summary = assembleProjectContext(files, directoryTree, source, mode, projectName);
    const totalTokenEstimate = estimateTokens(summary);

    const projectContext = {
      source,
      projectName,
      loadedAt: Date.now(),
      mode,
      files,
      totalTokenEstimate,
      directoryTree,
      summary,
    };

    return Response.json({ success: true, projectContext } satisfies ProjectLoadResult);
  } catch (err) {
    let error = err instanceof Error ? err.message : "Unknown error";
    if (/branch|ref|repo url|could not find|not found/i.test(error)) {
      error += " If this happened after a refresh, reconnect the GitHub URL once so the saved project source is updated.";
    }
    return Response.json({ success: false, error } satisfies ProjectLoadResult, { status: 400 });
  }
}
