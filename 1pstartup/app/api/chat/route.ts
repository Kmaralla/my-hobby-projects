import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt } from "@/lib/prompts";
import type { Mode, Message } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const client = new Anthropic();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseProviderErrorMessage(message: string): { type?: string; message: string } | null {
  try {
    const parsed = JSON.parse(message) as {
      type?: string;
      error?: { type?: string; message?: string };
      message?: string;
    };
    return {
      type: parsed.error?.type ?? parsed.type,
      message: parsed.error?.message ?? parsed.message ?? message,
    };
  } catch {
    return null;
  }
}

function normalizeChatError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "Unknown error");
  const parsed = parseProviderErrorMessage(raw);
  const type = parsed?.type ?? "";
  const message = parsed?.message ?? raw;

  if (type === "overloaded_error" || /overloaded/i.test(message)) {
    return "Anthropic is temporarily overloaded. Please wait a moment and try again.";
  }
  if (/rate.?limit/i.test(message)) {
    return "The model provider is rate limiting requests right now. Please wait a moment and try again.";
  }
  if (/api.?key|authentication|unauthorized/i.test(message)) {
    return "The Anthropic API key is missing or invalid. Check `ANTHROPIC_API_KEY` in your environment.";
  }

  return message;
}

function isRetryableProviderError(err: unknown): boolean {
  return normalizeChatError(err).includes("temporarily overloaded");
}

function mockText(mode: Mode, projectContext?: string): string {
  const projectLabel = projectContext ? "with project context" : "without project context";
  return `**MOCK ${mode.toUpperCase()} RESPONSE** — smoke test passed ${projectLabel}.`;
}

function streamText(text: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: Request) {
  const {
    mode,
    messages,
    context,
    projectContext,
    deep = false,
    stream: wantStream = true,
  } = (await req.json()) as {
    mode: Mode;
    messages: Message[];
    context?: string;
    projectContext?: string;
    deep?: boolean;
    stream?: boolean;
  };

  console.log(`[chat] mode=${mode} deep=${deep} stream=${wantStream} msgs=${messages.length} hasProject=${!!projectContext}`);

  if (process.env.ONEPSTARTUP_MOCK_CHAT === "1") {
    const text = mockText(mode, projectContext);
    return wantStream ? streamText(text) : Response.json({ text });
  }

  const systemPrompt = getSystemPrompt(mode, context, projectContext, { brief: !deep });
  const model = deep ? "claude-opus-4-6" : "claude-sonnet-4-6";
  const maxTokens = deep ? 8000 : 4000;
  const thinkingOpts = deep ? { thinking: { type: "adaptive" as const } } : {};

  // Non-streaming path — used by "Ask all 4"
  if (!wantStream) {
    try {
      let response;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          response = await client.messages.create({
            model,
            max_tokens: maxTokens,
            ...thinkingOpts,
            system: systemPrompt,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            stream: false,
          });
          break;
        } catch (err) {
          if (attempt === 0 && isRetryableProviderError(err)) {
            await wait(800);
            continue;
          }
          throw err;
        }
      }
      if (!response) throw new Error("No response from model provider");
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
      return Response.json({ text });
    } catch (err) {
      const msg = normalizeChatError(err);
      console.error("[chat] error:", msg);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // Streaming path (default)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let sentText = false;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const anthropicStream = client.messages.stream({
              model,
              max_tokens: maxTokens,
              ...thinkingOpts,
              system: systemPrompt,
              messages: messages.map((m) => ({ role: m.role, content: m.content })),
            });

            for await (const event of anthropicStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                sentText = true;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            console.log("[chat] stream complete");
            return;
          } catch (err) {
            if (!sentText && attempt === 0 && isRetryableProviderError(err)) {
              await wait(800);
              continue;
            }
            throw err;
          }
        }
      } catch (err) {
        const msg = normalizeChatError(err);
        console.error("[chat] stream error:", msg);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
