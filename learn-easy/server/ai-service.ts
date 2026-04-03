/**
 * AI Service — powered by Anthropic Claude
 *
 * Model strategy:
 *   - Lesson generation  → claude-opus-4-6   (quality matters for structured content)
 *   - Analogy / nudge / tutor → claude-haiku-4-5  (fast, low-cost, conversational)
 */

import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn("⚠️  ANTHROPIC_API_KEY not set. AI features will be disabled.");
}

function getClient(): Anthropic {
  if (!ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not configured. Set it in .env to enable AI lesson generation."
    );
  }
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ── Lesson generation ──────────────────────────────────────────────────────

export async function generateLessonFromContent(
  sourceContent: string,
  topicTitle: string
): Promise<{
  concepts: Array<{
    title: string;
    content: string;
    keyTakeaway: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  }>;
  questions: Array<{
    scenario: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    difficulty: "beginner" | "intermediate" | "advanced";
  }>;
}> {
  const client = getClient();

  const prompt = `You are an expert educational content creator. Generate structured learning content from the following text about "${topicTitle}".

Extract and create:
1. 3-5 key concepts (theory sections) with:
   - Title
   - Detailed content explanation (3-5 sentences)
   - Key takeaway (one sentence)
   - Difficulty level (beginner/intermediate/advanced)

2. For each concept, create 1-2 quiz questions with:
   - Scenario (brief context)
   - Question text
   - 4 multiple choice options
   - Correct answer index (0-3)
   - Explanation of the correct answer
   - Difficulty level

Content to process:
${sourceContent.substring(0, 10000)}${sourceContent.length > 10000 ? "\n...(truncated)" : ""}

Return JSON ONLY in this exact format (no markdown, no extra text):
{
  "concepts": [
    {
      "title": "Concept Title",
      "content": "Detailed explanation...",
      "keyTakeaway": "One sentence takeaway.",
      "difficulty": "beginner"
    }
  ],
  "questions": [
    {
      "scenario": "Brief context...",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this is correct...",
      "difficulty": "beginner"
    }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    system:
      "You are an expert at creating educational content. Return valid JSON only — no markdown fences, no extra text.",
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No response from Claude");

  // Strip potential markdown code fences just in case
  const cleaned = text.text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(cleaned);
}

// ── Analogy generation ─────────────────────────────────────────────────────

export async function generateAnalogy(
  conceptTitle: string,
  conceptContent: string
): Promise<{
  title: string;
  scenario: string;
  explanation: string;
  realWorldApplication: string;
}> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 512,
    system: "You are an expert at creating vivid educational analogies. Return valid JSON only.",
    messages: [
      {
        role: "user",
        content: `Create a real-world analogy for this concept:

Title: ${conceptTitle}
Content: ${conceptContent.substring(0, 1500)}

Return JSON:
{
  "title": "Analogy title",
  "scenario": "Real-world situation that mirrors the concept",
  "explanation": "How this situation maps to the concept",
  "realWorldApplication": "Where/how this concept is used in practice"
}`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("No response from Claude");
  const cleaned = text.text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(cleaned);
}

// ── Vibe Learner nudge ─────────────────────────────────────────────────────

export async function generateVibeNudge(
  conceptTitle: string,
  conceptKeyTakeaway: string,
  secondsSpent: number,
  accuracyPct: number
): Promise<{ message: string; type: "hint" | "challenge" | "encouragement" }> {
  if (!ANTHROPIC_API_KEY) {
    return { message: "Keep going — you're doing great!", type: "encouragement" };
  }

  const client = getClient();

  const toneGuide =
    accuracyPct < 50
      ? "The learner is struggling. Give a 1-sentence simple analogy or memory trick. Warm, not condescending."
      : accuracyPct > 80
        ? "The learner is excelling. Pose a brief thought-provoking follow-up question to deepen their thinking."
        : "The learner is progressing steadily. Share a brief real-world connection or encouragement.";

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 100,
    system: `You are a friendly, concise learning coach. Respond with ONLY a single sentence (max 25 words). No preamble. ${toneGuide}`,
    messages: [
      {
        role: "user",
        content: `Concept: "${conceptTitle}"\nKey idea: "${conceptKeyTakeaway}"\nTime on card: ${secondsSpent}s`,
      },
    ],
  });

  const text = response.content.find((b) => b.type === "text");
  const message = text?.type === "text" ? text.text.trim() : "Keep it up!";
  const type: "hint" | "challenge" | "encouragement" =
    accuracyPct < 50 ? "hint" : accuracyPct > 80 ? "challenge" : "encouragement";

  return { message, type };
}

// ── AI Tutor ───────────────────────────────────────────────────────────────

export async function answerConceptQuestion(
  conceptTitle: string,
  conceptContent: string,
  question: string
): Promise<string> {
  const client = getClient();

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    system: `You are a helpful tutor. Answer ONLY based on the concept below. Be concise (2-4 sentences). If the question is off-topic, gently redirect.

Concept: "${conceptTitle}"
Content: ${conceptContent.substring(0, 2000)}`,
    messages: [{ role: "user", content: question }],
  });

  const text = response.content.find((b) => b.type === "text");
  return text?.type === "text"
    ? text.text.trim()
    : "I couldn't generate an answer right now. Please try again.";
}

// ── Content extraction ─────────────────────────────────────────────────────

export async function extractContent(text: string): Promise<string> {
  return text.replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
