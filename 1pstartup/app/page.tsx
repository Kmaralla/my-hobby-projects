"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MODES, type Mode, type Message, type ModeConfig, type PinnedDecision } from "@/lib/types";
import type { ProjectSource, ProjectContext } from "@/lib/project/types";
import ProjectConnector from "./components/ProjectConnector";

const STORAGE_KEY = "agentstack_project_source";
const PINS_KEY = "agentstack_pins";

// Auto-briefing messages (mirrors lib/prompts.ts BRIEFING_PROMPTS — client-safe copy)
const BRIEFING_PROMPTS: Record<Mode, string> = {
  founder: "You just loaded my project. Give me a founder's 30-second take: what's being built, what's the core bet, and 2 things that immediately stand out as opportunities or risks.",
  dev: "You just loaded my codebase. Give me a staff engineer's quick read: tech stack, architecture pattern, and 2 things that stand out — good decisions or concerns.",
  "qa-eng": "You just loaded my project. Give me a QA brief: the main testable flows and the 2 highest-risk areas from a quality standpoint.",
  sales: "You just loaded my product. Give me a sales brief: what it does for the customer in one sentence, who the buyer is, and 2 things that make this easier or harder to sell.",
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("founder");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [manualContext, setManualContext] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [deep, setDeep] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const [projectSource, setProjectSource] = useState<ProjectSource | null>(null);
  const [projectContexts, setProjectContexts] = useState<Partial<Record<Mode, ProjectContext>>>({});
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectError, setProjectError] = useState<string | null>(null);

  const [pinnedDecisions, setPinnedDecisions] = useState<PinnedDecision[]>([]);
  const [showPins, setShowPins] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<"project" | "manual">("project");

  const projectContext = projectContexts[mode] ?? null;
  const activeMode = MODES.find((m) => m.id === mode)!;

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const briefedModesRef = useRef(new Set<Mode>());
  const justConnectedRef = useRef(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Elapsed timer while streaming
  useEffect(() => {
    if (!streaming) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [streaming]);

  // Load pinned decisions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PINS_KEY);
      if (saved) setPinnedDecisions(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // Restore saved project on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const source = JSON.parse(saved) as ProjectSource;
        loadProject(source, "founder");
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts: 1/2/3/4 to switch modes
  useEffect(() => {
    const modeKeys: Record<string, Mode> = { "1": "founder", "2": "dev", "3": "qa-eng", "4": "sales" };
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (modeKeys[e.key]) switchMode(modeKeys[e.key]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-brief when a new mode context loads
  useEffect(() => {
    const ctx = projectContexts[mode];
    if (ctx && !briefedModesRef.current.has(mode) && messages.length === 0) {
      briefedModesRef.current.add(mode);
      sendWithContext(BRIEFING_PROMPTS[mode], ctx);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectContexts, mode]);

  const loadProject = useCallback(async (source: ProjectSource, targetMode: Mode) => {
    setProjectLoading(true);
    setProjectError(null);
    try {
      const res = await fetch("/api/project/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, mode: targetMode }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load project");
      setProjectContexts((prev) => ({ ...prev, [targetMode]: data.projectContext }));
      setProjectSource(source);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(source)); } catch { /* ignore */ }
      return true;
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : "Unknown error");
      setProjectSource(null);
      setProjectContexts({});
      briefedModesRef.current.clear();
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
      return false;
    } finally {
      setProjectLoading(false);
    }
  }, []);

  function abortStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setStreaming(false);
  }

  function switchMode(newMode: Mode) {
    abortStream();
    setMode(newMode);
    setMessages([]);
    if (projectSource && !projectContexts[newMode]) {
      loadProject(projectSource, newMode);
    }
  }

  function disconnectProject() {
    setProjectSource(null);
    setProjectContexts({});
    setProjectError(null);
    briefedModesRef.current.clear();
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  async function handleProjectLoad(source: ProjectSource) {
    justConnectedRef.current = true;
    briefedModesRef.current.clear(); // reset so new project gets a fresh brief
    const ok = await loadProject(source, mode);
    if (ok) setShowModal(false);
  }

  // Core send — accepts optional context override (used by auto-brief)
  async function sendWithContext(text: string, ctxOverride?: ProjectContext) {
    if (!text.trim() || streaming) return;
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const controller = new AbortController();
    abortRef.current = controller;

    const effectiveCtx = ctxOverride ?? projectContext;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mode,
          messages: newMessages,
          context: manualContext || undefined,
          projectContext: effectiveCtx?.summary || undefined,
          deep,
          stream: true,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6);
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (!last || last.role !== "assistant") {
                  return [...prev, { role: "assistant", content: parsed.text }];
                }
                return [...prev.slice(0, -1), { role: "assistant", content: last.content + parsed.text }];
              });
            }
          } catch (e) {
            if (e instanceof Error && !e.message.includes("JSON")) throw e;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        const errMsg = { role: "assistant" as const, content: `**Error:** ${msg}` };
        if (!last || last.role !== "assistant") return [...prev, errMsg];
        return [...prev.slice(0, -1), errMsg];
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function send(textOverride?: string) {
    return sendWithContext(textOverride ?? input);
  }

  // Ask all 4 roles in parallel (non-streaming, shows results together)
  async function askAll4() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const results = await Promise.all(
        MODES.map(async (m) => {
          const ctx = projectContexts[m.id];
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: m.id,
              messages: newMessages,
              projectContext: ctx?.summary,
              deep: false,
              stream: false,
            }),
          });
          const data = await res.json();
          return { mode: m, text: (data.text || data.error || "No response") as string };
        })
      );

      const combined = results
        .map((r) => `### ${r.mode.icon} ${r.mode.label}\n${r.text}`)
        .join("\n\n---\n\n");

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: combined },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `**Error:** ${msg}` },
      ]);
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  function pinMessage(content: string) {
    const m = MODES.find((m) => m.id === mode)!;
    const decision: PinnedDecision = {
      id: Date.now().toString(),
      mode,
      modeLabel: m.label,
      modeIcon: m.icon,
      content: content.slice(0, 600),
      timestamp: Date.now(),
    };
    const next = [decision, ...pinnedDecisions];
    setPinnedDecisions(next);
    try { localStorage.setItem(PINS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function unpinDecision(id: string) {
    const next = pinnedDecisions.filter((d) => d.id !== id);
    setPinnedDecisions(next);
    try { localStorage.setItem(PINS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-2 shrink-0">
        <span className="font-bold text-slate-900 tracking-tight">agentstack</span>
        <span className="text-slate-300 text-sm">|</span>

        {/* Mode pills with keyboard hint */}
        <div className="flex gap-1">
          {MODES.map((m, i) => (
            <button
              key={m.id}
              onClick={() => switchMode(m.id)}
              title={`Switch to ${m.label} (press ${i + 1})`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                mode === m.id
                  ? `${m.bgColor} ${m.borderColor} ${m.color} shadow-sm`
                  : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300"
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
              <span className={`text-[10px] opacity-40 ${mode === m.id ? "" : "hidden group-hover:inline"}`}>{i + 1}</span>
              {projectLoading && mode === m.id && (
                <span className="w-2.5 h-2.5 border border-current border-t-transparent rounded-full animate-spin" />
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Decision log badge */}
          {pinnedDecisions.length > 0 && (
            <button
              onClick={() => setShowPins(true)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
            >
              📌 {pinnedDecisions.length}
            </button>
          )}

          {projectContext ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { setShowModal(true); setModalTab("project"); }}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${activeMode.bgColor} ${activeMode.borderColor} ${activeMode.color}`}
              >
                <span>📁</span>
                <span>{projectContext.projectName}</span>
                <span className="opacity-50">· {projectContext.files.length} files</span>
              </button>
              <button onClick={disconnectProject} className="text-slate-300 hover:text-red-400 text-sm" title="Disconnect">✕</button>
            </div>
          ) : (
            <button
              onClick={() => { setShowModal(true); setModalTab("project"); }}
              className="text-xs px-3 py-1 rounded-full border border-dashed border-slate-300 text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-colors"
            >
              + connect project
            </button>
          )}
          <button
            onClick={() => { setShowModal(true); setModalTab("manual"); }}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              manualContext ? "border-slate-400 text-slate-700 bg-slate-100" : "border-slate-200 text-slate-400 hover:text-slate-600"
            }`}
            title="Manual context"
          >✏️</button>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors">
              clear
            </button>
          )}
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {messages.length === 0 ? (
          <EmptyState
            mode={activeMode}
            hasProject={!!projectContext}
            projectName={projectContext?.projectName}
            onConnect={() => { setShowModal(true); setModalTab("project"); }}
            onSend={send}
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-4 pb-2">
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                message={msg}
                mode={activeMode}
                onPin={() => pinMessage(msg.content)}
                isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              placeholder={getPlaceholder(mode, !!projectContext)}
              rows={1}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-800 placeholder:text-slate-400 disabled:opacity-50"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            {/* Ask all 4 */}
            <button
              onClick={askAll4}
              disabled={streaming || !input.trim()}
              title="Ask all 4 roles simultaneously"
              className="px-3 py-3 rounded-xl text-xs font-medium border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 whitespace-nowrap"
            >
              Ask all 4
            </button>
            {/* Send */}
            <button
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors shrink-0 min-w-[72px] ${
                streaming || !input.trim()
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : `${getModeButtonStyle(mode)} text-white`
              }`}
            >
              {streaming
                ? <span className="flex items-center gap-1.5 justify-center">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {elapsed > 0 && <span className="text-xs">{elapsed}s</span>}
                  </span>
                : "Send"}
            </button>
          </div>

          {/* Bottom bar: mode info + deep toggle */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              <span className={`font-medium ${activeMode.color}`}>{activeMode.icon} {activeMode.label}</span>
              {projectContext && <span className="text-slate-300"> · 📁 {projectContext.projectName}</span>}
              <span className="text-slate-300"> · Enter↵  · keys 1–4 switch role</span>
            </p>
            {/* Deep / Brief toggle */}
            <button
              onClick={() => setDeep((d) => !d)}
              title={deep ? "Deep mode: Opus + extended thinking. Click for Fast mode." : "Fast mode: Sonnet, concise. Click for Deep mode."}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                deep
                  ? "bg-violet-50 border-violet-200 text-violet-700"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400"
              }`}
            >
              {deep ? "🧠 Deep" : "⚡ Fast"}
            </button>
          </div>
        </div>
      </div>

      {/* Decision Log Modal */}
      {showPins && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPins(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-semibold text-slate-800">📌 Decision Log</h2>
              <button onClick={() => setShowPins(false)} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {pinnedDecisions.length === 0 ? (
                <p className="text-sm text-slate-400 p-5">No pinned decisions yet. Click 📌 on any response to save it here.</p>
              ) : (
                pinnedDecisions.map((d) => (
                  <div key={d.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{d.modeIcon} {d.modeLabel} · {new Date(d.timestamp).toLocaleDateString()}</span>
                      <button onClick={() => unpinDecision(d.id)} className="text-xs text-slate-300 hover:text-red-400">remove</button>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-4">{d.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connect / Manual context modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex border-b border-slate-200">
              {(["project", "manual"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setModalTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    modalTab === tab
                      ? "text-slate-800 border-b-2 border-slate-800 -mb-px bg-white"
                      : "text-slate-500 hover:text-slate-700 bg-slate-50"
                  }`}
                >
                  {tab === "project" ? "📁 Connect project" : "✏️ Manual context"}
                </button>
              ))}
              <button onClick={() => setShowModal(false)} className="px-4 text-slate-400 hover:text-slate-600 text-lg">✕</button>
            </div>
            <div className="p-5">
              {modalTab === "project" ? (
                <ProjectConnector mode={mode} onLoad={handleProjectLoad} loading={projectLoading} error={projectError} />
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Context included in every message for this session.</p>
                  <textarea
                    value={manualContext}
                    onChange={(e) => setManualContext(e.target.value)}
                    placeholder="Paste a PR description, feature spec, or any context…"
                    rows={5}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-slate-300 text-slate-700 placeholder:text-slate-400"
                  />
                  <button onClick={() => setShowModal(false)} className="w-full py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ mode, hasProject, projectName, onConnect, onSend }: {
  mode: ModeConfig;
  hasProject: boolean;
  projectName?: string;
  onConnect: () => void;
  onSend: (text: string) => void;
}) {
  const starters: Record<Mode, string[]> = {
    founder: hasProject
      ? [
          "Should we ship this or cut scope? Give me a GO/NO-GO with the 3 questions I must answer first.",
          "What's the MVP — what can we cut without losing the core value?",
          "What are the top 3 bets this product is making, and which ones are unvalidated?",
        ]
      : [
          "We're building an AI-powered code review tool. Is this a real business or a feature?",
          "I have 3 features ready to ship. Help me prioritize: user invites, analytics dashboard, API access.",
          "What's the difference between a product that gets traction and one that doesn't at this stage?",
        ],
    dev: hasProject
      ? [
          "Review this codebase for security issues — flag anything critical before we ship.",
          "What's the biggest architectural debt here and what's the fix?",
          "What would a staff engineer change first in this code?",
        ]
      : [
          "Here's my auth implementation — find the security holes: [paste code]",
          "I'm choosing between a monolith and microservices for a 3-person team. What's the right call?",
          "Review this API design and tell me what breaks at scale or under load.",
        ],
    "qa-eng": hasProject
      ? [
          "Give me a test plan for the most critical user flow in this project.",
          "What are the top 3 bugs most likely hiding in this codebase right now?",
          "What regression risk does this project have and what should I re-test before every release?",
        ]
      : [
          "Write a test plan for a payment checkout flow — happy path + edge cases that actually break things.",
          "I'm testing a file upload feature. What edge cases will find real bugs?",
          "What's a realistic QA checklist before shipping a new user-facing API?",
        ],
    sales: hasProject
      ? [
          "Write a 60-second cold call pitch for this product targeting a VP of Engineering.",
          "What are the 3 hardest objections a prospect will raise and how do I counter them?",
          "How should I position this against competitors? Where do we win, where do we lose?",
        ]
      : [
          "I'm selling a developer tool at $500/mo per team. What's the right sales motion and who's the buyer?",
          "Help me write a value prop for an AI code reviewer targeting CTOs at Series B startups.",
          "What's the difference between a feature that sells itself and one that needs a sales team?",
        ],
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center justify-center min-h-full py-8 text-center">
      <div className="text-4xl mb-3">{mode.icon}</div>
      <h2 className={`text-base font-bold mb-1 ${mode.color}`}>{mode.label} Mode</h2>
      <p className="text-slate-400 text-xs font-medium mb-1 uppercase tracking-wide">{mode.tagline}</p>
      {hasProject ? (
        <p className="text-slate-500 text-sm mb-1">
          Analyzing <span className="font-medium text-slate-700">{projectName}</span>
        </p>
      ) : (
        <button onClick={onConnect} className="text-xs text-slate-400 hover:text-slate-600 underline mb-1 transition-colors">
          Connect a project for deeper analysis →
        </button>
      )}
      <p className="text-slate-400 text-sm mb-5 max-w-xs">{mode.description}</p>
      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        {starters[mode.id].map((s) => (
          <button
            key={s}
            onClick={() => onSend(s)}
            className={`text-xs px-3 py-2.5 rounded-lg text-left transition-all hover:shadow-sm active:scale-[0.99] ${mode.bgColor} ${mode.color} border ${mode.borderColor} hover:opacity-90`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Chat Bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ message, mode, onPin, isStreaming }: {
  message: Message;
  mode: ModeConfig;
  onPin: () => void;
  isStreaming: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(message.content).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-slate-800 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start group">
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${mode.bgColor} border ${mode.borderColor}`}>
        {mode.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-semibold mb-1 ${mode.color}`}>{mode.label}</div>
        <div className={`prose prose-sm text-slate-800 bg-white rounded-2xl rounded-tl-sm px-4 py-3 border ${mode.borderColor} shadow-sm max-w-none`}>
          {message.content ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          ) : (
            <span className="flex items-center gap-1 text-slate-300">
              {[0, 150, 300].map((d) => (
                <span key={d} className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
              ))}
            </span>
          )}
        </div>
        {/* Action buttons — show on hover or when content exists */}
        {message.content && !isStreaming && (
          <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={copy}
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              {copied ? "✓ copied" : "⧉ copy"}
            </button>
            <button
              onClick={onPin}
              className="text-xs text-slate-400 hover:text-amber-600 flex items-center gap-1"
            >
              📌 pin
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPlaceholder(mode: Mode, hasProject: boolean): string {
  if (hasProject) {
    const map: Record<Mode, string> = {
      founder: "Ask about strategy, priorities, or risks in this project…",
      dev: "Ask for a code review, architecture critique, or security audit…",
      "qa-eng": "Ask for a test plan, edge cases, or regression analysis…",
      sales: "Ask for positioning, a pitch, or objection handling…",
    };
    return map[mode];
  }
  const map: Record<Mode, string> = {
    founder: "Describe what you're building or ask for a strategic review…",
    dev: "Paste code, describe a PR, or ask for an architecture review…",
    "qa-eng": "Describe a feature or flow to get a test plan and edge cases…",
    sales: "Describe a feature or product to get positioning and a pitch…",
  };
  return map[mode];
}

function getModeButtonStyle(mode: Mode): string {
  const map: Record<Mode, string> = {
    founder: "bg-violet-600 hover:bg-violet-700",
    dev: "bg-blue-600 hover:bg-blue-700",
    "qa-eng": "bg-emerald-600 hover:bg-emerald-700",
    sales: "bg-orange-500 hover:bg-orange-600",
  };
  return map[mode];
}
