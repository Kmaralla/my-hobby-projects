import { spawn } from "node:child_process";
import net from "node:net";

const HOST = "127.0.0.1";
const DEFAULT_REPO = "https://github.com/Kmaralla/my-hobby-projects/tree/main/1pstartup";

function findOpenPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not allocate a port")));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function waitForApp(baseUrl, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok) return;
    } catch {
      // Keep polling until the dev server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`App did not become ready at ${baseUrl}`);
}

function parseGitHubUrl(input) {
  const cleaned = input.trim()
    .replace(/^https?:\/\/github\.com\//, "")
    .replace(/^github\.com\//, "")
    .replace(/\.git$/, "");
  const parts = cleaned.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error(`Invalid GitHub URL: ${input}`);

  const [owner, repo, view, branch, ...pathParts] = parts;
  if ((view === "tree" || view === "blob") && branch) {
    return {
      type: "github",
      owner,
      repo,
      branch,
      path: pathParts.length > 0 ? pathParts.join("/") : undefined,
    };
  }

  return { type: "github", owner, repo, branch: "" };
}

async function loadProject(baseUrl, repoUrl) {
  const res = await fetch(`${baseUrl}/api/project/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: parseGitHubUrl(repoUrl),
      mode: "product",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Project load failed with ${res.status}`);
  }
  if (!data.projectContext?.files?.length) {
    throw new Error("Project loaded but no files were selected");
  }
  return data.projectContext;
}

async function askStreamingChat(baseUrl, projectContext) {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "product",
      messages: [
        {
          role: "user",
          content: "Give me a one-line PM smoke test response.",
        },
      ],
      projectContext: projectContext.summary,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`Chat request failed with ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6);
      if (payload === "[DONE]") return text;
      const parsed = JSON.parse(payload);
      if (parsed.error) throw new Error(parsed.error);
      if (parsed.text) text += parsed.text;
    }
  }

  return text;
}

async function main() {
  const port = await findOpenPort();
  const baseUrl = `http://${HOST}:${port}`;
  const repoUrl = process.env.SMOKE_REPO_URL || DEFAULT_REPO;

  const child = spawn(
    "npm",
    ["run", "dev", "--", "--hostname", HOST, "--port", String(port)],
    {
      cwd: process.cwd(),
      env: { ...process.env, ONEPSTARTUP_MOCK_CHAT: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });

  try {
    await waitForApp(baseUrl);
    const projectContext = await loadProject(baseUrl, repoUrl);
    const responseText = await askStreamingChat(baseUrl, projectContext);

    if (!responseText.includes("smoke test passed")) {
      throw new Error(`Unexpected chat response: ${responseText}`);
    }

    console.log(`Smoke passed: loaded ${projectContext.projectName} (${projectContext.files.length} files) and received streamed chat text.`);
  } catch (err) {
    console.error(output.trim());
    throw err;
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
