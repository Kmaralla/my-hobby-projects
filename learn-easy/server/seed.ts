import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { topics, concepts, conceptQuestions } from "@shared/schema";
import { sql } from "drizzle-orm";

const { Pool } = pg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL must be set");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(pool);

const SEED_TOPICS = [
  {
    id: "prompt-engineering",
    title: "Prompt Engineering",
    description: "Learn to write effective prompts for AI models to get better results",
    unlockDay: 1,
    concepts: [
      {
        title: "What is Prompt Engineering?",
        content: "Prompt engineering is the practice of crafting inputs to AI models to get the best possible outputs. A prompt is the instruction or question you give to an AI — the way you phrase it dramatically changes the quality of the response.\n\nThink of it like giving directions: 'Go somewhere' vs 'Turn left on Main St, drive 2 blocks, turn right on Oak Ave' — the second gets you where you need to go.\n\nPrompt engineering doesn't require coding. It's a communication skill for working with AI.",
        keyTakeaway: "The quality of your AI output is directly determined by the quality of your prompt.",
        difficulty: "beginner",
        questions: [
          {
            question: "What is the main goal of prompt engineering?",
            options: ["To train new AI models from scratch", "To craft inputs that get the best outputs from AI models", "To evaluate AI model performance", "To reduce AI compute costs"],
            correctIndex: 1,
            explanation: "Prompt engineering focuses on crafting the right inputs to elicit the best possible outputs from AI models — no model training required.",
          },
        ],
      },
      {
        title: "Zero-Shot vs Few-Shot Prompting",
        content: "Zero-shot prompting gives the AI no examples — you just describe what you want. Few-shot prompting provides 2–5 examples first, then asks the AI to do the same task.\n\nFew-shot example:\n'Great product, fast shipping → Positive\nTerrible experience, broken item → Negative\nIt arrived on time → ?'\n\nFew-shot works better when the output format or style matters. Zero-shot works well for clear, common tasks.",
        keyTakeaway: "Use few-shot examples when you need the AI to match a specific format or style consistently.",
        difficulty: "beginner",
        questions: [
          {
            question: "When is few-shot prompting most useful?",
            options: ["When you want faster responses", "When the output format or style needs to be consistent", "When the task is very simple", "When you have no examples available"],
            correctIndex: 1,
            explanation: "Few-shot prompting shines when consistency of format matters — you show the model exactly what the output should look like with 2–5 examples.",
          },
        ],
      },
      {
        title: "Chain of Thought Prompting",
        content: "Chain of thought (CoT) prompting asks the AI to reason step by step before giving a final answer. This dramatically improves accuracy on complex tasks.\n\nInstead of: 'Which plan is cheaper?'\nUse: 'Which plan is cheaper? Think step by step.'\n\nThe AI writes out its reasoning — 'Plan A costs $12/month × 12 = $144/year. Plan B costs $10/month × 12 = $120/year. Plan B is cheaper.' — and arrives at the right answer far more reliably.",
        keyTakeaway: "Adding 'think step by step' or 'let's reason through this' significantly improves AI accuracy on complex problems.",
        difficulty: "intermediate",
        questions: [
          {
            question: "Why does chain of thought prompting improve accuracy?",
            options: ["It makes the model run more slowly and carefully", "It forces the model to show its reasoning, catching errors before the final answer", "It provides more training data to the model", "It bypasses the model's safety filters"],
            correctIndex: 1,
            explanation: "When the model writes out its reasoning steps, it's less likely to skip over errors. The intermediate steps act as a self-check before committing to a final answer.",
          },
        ],
      },
      {
        title: "System Prompts and Personas",
        content: "A system prompt sets the context, role, and constraints for the AI before the conversation starts. It's like giving an actor their character brief.\n\nExample system prompt:\n'You are a senior software engineer who explains concepts simply to junior developers. Always include a short code example. Keep responses under 200 words.'\n\nGood system prompts include:\n- Role (who the AI is)\n- Tone (how it speaks)\n- Constraints (what to avoid)\n- Output format\n- Target audience",
        keyTakeaway: "System prompts define WHO the AI is and HOW it should respond throughout the entire conversation.",
        difficulty: "intermediate",
        questions: [
          {
            question: "Which of these is NOT typically part of an effective system prompt?",
            options: ["The AI's role and persona", "The target audience", "The AI model's training data cutoff date", "Output format constraints"],
            correctIndex: 2,
            explanation: "System prompts define role, tone, constraints, format, and audience — things you control. The model's training cutoff is fixed and not something you set in a system prompt.",
          },
        ],
      },
    ],
  },
  {
    id: "ai-fundamentals",
    title: "AI Fundamentals",
    description: "Core concepts behind modern artificial intelligence and machine learning",
    unlockDay: 1,
    concepts: [
      {
        title: "What is Machine Learning?",
        content: "Machine learning (ML) teaches computers by example rather than explicit rules. Instead of programming every rule, you show the system thousands of examples and it finds patterns on its own.\n\nTraditional programming: IF email contains 'Nigerian prince' THEN mark as spam\nML approach: Show 10,000 spam and 10,000 legitimate emails — the model learns what makes them different automatically.\n\nML systems improve with more data and can handle complexity that would be impossible to program manually.",
        keyTakeaway: "ML learns patterns from data instead of following hand-written rules.",
        difficulty: "beginner",
        questions: [
          {
            question: "How does machine learning differ from traditional programming?",
            options: ["ML is always faster to run", "ML learns rules from data instead of following explicit hand-written rules", "ML only works for image recognition", "ML requires the programmer to define every decision"],
            correctIndex: 1,
            explanation: "Traditional programming requires explicit rules for every case. ML learns rules automatically by finding patterns in large amounts of example data.",
          },
        ],
      },
      {
        title: "Neural Networks Explained",
        content: "Neural networks are loosely inspired by the human brain — layers of interconnected nodes (neurons) that transform data as it flows through.\n\nStructure:\n- Input layer: receives raw data\n- Hidden layers: transform and extract patterns\n- Output layer: produces the final result\n\nEach connection has a weight (importance score). Training adjusts these weights so the network gets better at its task. 'Deep learning' = neural networks with many hidden layers.\n\nModern LLMs like Claude and GPT-4 are neural networks with hundreds of billions of weights.",
        keyTakeaway: "Neural networks learn by adjusting billions of connection weights during training.",
        difficulty: "beginner",
        questions: [
          {
            question: "What happens during neural network training?",
            options: ["New neurons are added to handle harder examples", "Connection weights are adjusted to reduce errors over time", "The network downloads more training data", "The network memorizes every training example exactly"],
            correctIndex: 1,
            explanation: "Training is the process of adjusting connection weights to minimize prediction errors. Over thousands of iterations, the weights settle into values that produce accurate outputs.",
          },
        ],
      },
      {
        title: "Supervised vs Unsupervised Learning",
        content: "Supervised learning trains on labeled data — each example has a known correct answer.\nUse cases: spam detection, image classification, price prediction, fraud detection.\n\nUnsupervised learning finds patterns in unlabeled data — no correct answers given.\nUse cases: customer segmentation, anomaly detection, topic modeling.\n\nReinforcement learning trains an agent to take actions that maximize rewards.\nUse cases: game AI, robotics, ad bidding, RLHF (training ChatGPT).",
        keyTakeaway: "Supervised = labeled answers, Unsupervised = hidden patterns, Reinforcement = learn from rewards.",
        difficulty: "beginner",
        questions: [
          {
            question: "You have 1 million customer transactions labeled 'fraud' or 'legitimate'. Which ML type do you use?",
            options: ["Unsupervised learning — find patterns without labels", "Reinforcement learning — reward the model for correct detections", "Supervised learning — train on labeled examples", "Transfer learning — copy a pre-trained model"],
            correctIndex: 2,
            explanation: "You have labeled data (each transaction already marked fraud or legitimate), so this is supervised learning — you train the model on these labeled examples.",
          },
        ],
      },
      {
        title: "Large Language Models (LLMs)",
        content: "LLMs are neural networks trained on massive text datasets to predict the next word/token. Through this deceptively simple task at enormous scale, they learn grammar, facts, reasoning, and coding.\n\nKey facts:\n- Trained on trillions of words from the web, books, and code\n- Use the Transformer architecture (attention mechanisms)\n- Can be fine-tuned for specific tasks\n- Context window = how much text they can 'see' at once\n\nGPT-4, Claude, Gemini, Llama are all LLMs.",
        keyTakeaway: "LLMs learn language and reasoning by predicting the next word across trillions of examples.",
        difficulty: "intermediate",
        questions: [
          {
            question: "What is the core training objective of LLMs?",
            options: ["Classify images into categories", "Answer multiple choice questions correctly", "Predict the next token in a sequence", "Translate between programming languages"],
            correctIndex: 2,
            explanation: "LLMs are trained to predict the next token (word/subword). This simple objective, applied at massive scale with huge datasets, produces models that understand language, reason, and generate coherent text.",
          },
        ],
      },
    ],
  },
  {
    id: "vector-databases-rag",
    title: "Vector Databases & RAG",
    description: "How AI systems retrieve and use external knowledge to answer questions accurately",
    unlockDay: 1,
    concepts: [
      {
        title: "What are Embeddings?",
        content: "Embeddings are numerical representations of text as vectors — lists of floating-point numbers. The key property: similar meanings → similar vectors.\n\n'dog' and 'puppy' have very similar embeddings.\n'dog' and 'asteroid' have very different embeddings.\n\nEmbeddings capture semantic meaning, not spelling. You measure similarity with cosine similarity — values near 1 mean very similar, near 0 mean unrelated.\n\nModels like text-embedding-ada-002 or Claude's embeddings convert any text to a vector (typically 1536 dimensions).",
        keyTakeaway: "Embeddings turn text into numbers where similar meanings produce similar numbers, enabling semantic search.",
        difficulty: "intermediate",
        questions: [
          {
            question: "What makes embeddings more useful than keyword search?",
            options: ["They are faster to compute", "They capture semantic similarity — 'car' and 'automobile' are recognized as related", "They require less storage space", "They work only with structured data"],
            correctIndex: 1,
            explanation: "Keyword search only finds exact matches. Embeddings capture meaning, so 'automobile' and 'car' have similar vectors — semantic search finds conceptually related content even without exact keyword overlap.",
          },
        ],
      },
      {
        title: "Vector Databases",
        content: "A vector database stores embeddings and enables fast similarity search: 'find the N most similar vectors to this query vector.'\n\nTraditional DB: WHERE title = 'machine learning' (exact match)\nVector DB: find 10 documents most semantically similar to this question (similarity search)\n\nPopular options:\n- Pinecone (fully managed)\n- Weaviate (open source)\n- Chroma (local-first)\n- pgvector (Postgres extension — Supabase supports this!)\n\nUse case: store all company docs as embeddings, retrieve the most relevant ones when a user asks a question.",
        keyTakeaway: "Vector databases find the most semantically similar items, enabling AI-powered search over your own data.",
        difficulty: "intermediate",
        questions: [
          {
            question: "A user asks 'how do I reset my password?' Your vector DB finds the doc titled 'Account Recovery Steps'. What made this work?",
            options: ["Keyword matching on 'password' and 'reset'", "The question and document had similar embeddings even with different words", "The database searched all documents in order", "A human curator tagged the document"],
            correctIndex: 1,
            explanation: "The question and document are semantically similar even though they don't share keywords. Their embedding vectors are close, so the vector DB correctly retrieved the relevant document.",
          },
        ],
      },
      {
        title: "Retrieval Augmented Generation (RAG)",
        content: "RAG combines an LLM with a retrieval system to give AI access to specific, up-to-date knowledge.\n\nRAG pipeline:\n1. User asks a question\n2. Convert question to embedding\n3. Search vector DB for most relevant documents\n4. Inject retrieved documents into the LLM prompt as context\n5. LLM answers using the retrieved facts\n\nThis solves two big LLM problems:\n- Hallucination (making up facts) → model has real sources\n- Outdated knowledge → retrieve current documents at query time\n\nYour customer support bot can answer questions about your latest product docs without retraining the model.",
        keyTakeaway: "RAG gives LLMs access to fresh, specific knowledge by retrieving relevant documents at query time.",
        difficulty: "intermediate",
        questions: [
          {
            question: "What problem does RAG primarily solve?",
            options: ["Making LLMs generate text faster", "Giving LLMs access to current and specific knowledge beyond their training data", "Reducing the cost of LLM API calls", "Making LLM outputs shorter"],
            correctIndex: 1,
            explanation: "LLMs have a training cutoff and may hallucinate facts. RAG retrieves relevant, accurate documents at query time and provides them as context, so the model can answer with real, current information.",
          },
        ],
      },
    ],
  },
];

async function seed() {
  console.log("Seeding default topics...\n");

  for (const topicData of SEED_TOPICS) {
    process.stdout.write(`  Topic: ${topicData.title} ... `);

    await db.execute(sql`
      INSERT INTO topics (id, title, description, unlock_day, is_active)
      VALUES (${topicData.id}, ${topicData.title}, ${topicData.description}, ${topicData.unlockDay}, true)
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
    `);

    for (let i = 0; i < topicData.concepts.length; i++) {
      const c = topicData.concepts[i];
      const conceptId = `${topicData.id}-c${i}`;

      await db.execute(sql`
        INSERT INTO concepts (id, topic_id, title, content, key_takeaway, difficulty, "order", is_active)
        VALUES (${conceptId}, ${topicData.id}, ${c.title}, ${c.content}, ${c.keyTakeaway}, ${c.difficulty}, ${i}, true)
        ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content
      `);

      for (let j = 0; j < c.questions.length; j++) {
        const q = c.questions[j];
        const qId = `${conceptId}-q${j}`;

        await db.execute(sql`
          INSERT INTO concept_questions (id, concept_id, question, scenario, options, correct_index, explanation, difficulty, credits_reward, is_active)
          VALUES (${qId}, ${conceptId}, ${q.question}, null, ${JSON.stringify(q.options)}, ${q.correctIndex}, ${q.explanation}, ${c.difficulty}, 10, true)
          ON CONFLICT (id) DO UPDATE SET question = EXCLUDED.question
        `);
      }
    }

    console.log(`✓ (${topicData.concepts.length} concepts)`);
  }

  console.log("\nSeed complete!");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
