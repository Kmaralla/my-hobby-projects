"use client";

import { useState } from "react";
import type { ProjectSource } from "@/lib/project/types";
import type { Mode } from "@/lib/types";

interface Props {
  mode: Mode;
  onLoad: (source: ProjectSource) => void;
  loading: boolean;
  error: string | null;
}

const IS_DEPLOYED = process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined;

export default function ProjectConnector({ mode, onLoad, loading, error }: Props) {
  const [sourceType, setSourceType] = useState<"local" | "github">("github");
  const [localPath, setLocalPath] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  function handleLoad() {
    if (sourceType === "local") {
      if (!localPath.trim()) return;
      onLoad({ type: "local", path: localPath.trim() });
    } else {
      if (!githubUrl.trim()) return;
      const cleaned = githubUrl.trim()
        .replace(/^https?:\/\/github\.com\//, "")
        .replace(/^github\.com\//, "")
        .replace(/\.git$/, "");
      const parts = cleaned.split("/").filter(Boolean);
      if (parts.length < 2) return;
      onLoad({
        type: "github",
        owner: parts[0],
        repo: parts[1],
        branch: parts[2] || "",
        token: githubToken.trim() || undefined,
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* Source type toggle — local path hidden when deployed to Vercel */}
      <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg w-fit">
        {(IS_DEPLOYED ? (["github"] as const) : (["github", "local"] as const)).map((type) => (
          <button
            key={type}
            onClick={() => setSourceType(type)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              sourceType === type
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {type === "github" ? "GitHub URL" : "Local path"}
          </button>
        ))}
      </div>

      {/* Inputs */}
      {sourceType === "local" ? (
        <div>
          <input
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            placeholder="/Users/you/projects/my-app"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 placeholder:text-slate-400 bg-white"
          />
          <p className="text-xs text-slate-400 mt-1">Absolute path to your project directory</p>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            placeholder="https://github.com/owner/repo"
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 placeholder:text-slate-400 bg-white"
          />

          {/* Token field — always visible, highlighted when error is about private repo */}
          <div className={`rounded-lg border p-3 space-y-1.5 ${
            error?.includes("private") || error?.includes("token") || error?.includes("not found") || error?.includes("Not Found")
              ? "border-amber-300 bg-amber-50"
              : "border-slate-200 bg-slate-50"
          }`}>
            <label className={`text-xs font-medium ${
              error?.includes("private") || error?.includes("token") || error?.includes("not found") || error?.includes("Not Found")
                ? "text-amber-700"
                : "text-slate-500"
            }`}>
              {error?.includes("private") || error?.includes("not found") || error?.includes("Not Found")
                ? "⚠️ Private repo? A GitHub token is required."
                : "GitHub token (required for private repos)"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLoad()}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="flex-1 text-sm border border-slate-200 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 placeholder:text-slate-400 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
              >
                {showToken ? "hide" : "show"}
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Generate at{" "}
              <span className="font-mono">github.com/settings/tokens</span> with <span className="font-mono">repo</span> scope.
              Never stored — session only.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !error.includes("private") && !error.includes("token") && !error.includes("not found") && !error.includes("Not Found") && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Load button */}
      <button
        onClick={handleLoad}
        disabled={loading || (sourceType === "local" ? !localPath.trim() : !githubUrl.trim())}
        className="w-full py-2 text-sm font-medium rounded-lg transition-colors bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Loading project for {mode} lens…
          </>
        ) : (
          <>Load project</>
        )}
      </button>
    </div>
  );
}
