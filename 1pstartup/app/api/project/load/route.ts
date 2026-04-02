import type { Mode } from "@/lib/types";
import type { ProjectSource, ProjectLoadResult } from "@/lib/project/types";
import { loadLocalProject } from "@/lib/project/local-loader";
import { loadGitHubProject, parseGitHubInput } from "@/lib/project/github-loader";
import { assembleProjectContext } from "@/lib/project/context-assembler";
import { estimateTokens } from "@/lib/project/token-budget";

export async function POST(req: Request): Promise<Response> {
  try {
    const { source, mode } = (await req.json()) as { source: ProjectSource; mode: Mode };

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
      const result = await loadGitHubProject(
        source.owner, source.repo, source.branch, mode, source.token
      );
      files = result.files;
      directoryTree = result.directoryTree;
      projectName = source.repo;
      // Update branch with resolved value
      source.branch = result.resolvedBranch;
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
    const error = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ success: false, error } satisfies ProjectLoadResult, { status: 400 });
  }
}
