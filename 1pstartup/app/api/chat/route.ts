import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt } from "@/lib/prompts";
import type { Mode, Message } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const client = new Anthropic();

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

  if (process.env.AGENTSTACK_MOCK_CHAT === "1") {
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
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        ...thinkingOpts,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: false,
      });
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("");
      return Response.json({ text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.error("[chat] error:", msg);
      return Response.json({ error: msg }, { status: 500 });
    }
  }

  // Streaming path (default)
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        console.log("[chat] stream complete");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
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
