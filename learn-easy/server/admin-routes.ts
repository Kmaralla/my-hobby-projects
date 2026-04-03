import type { Express } from "express";
import { db } from "./db";
import { contentSources, topics, concepts, conceptQuestions, adminUsers } from "@shared/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { registerContentIngestionRoutes, scrapeUrlContent } from "./content-ingestion";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export function registerAdminRoutes(app: Express) {
  // Register content ingestion routes
  registerContentIngestionRoutes(app);

  app.post("/api/admin/login", async (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) {
      res.json({ success: true, token: "admin-session" });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.get("/api/admin/sources", async (req, res) => {
    const sources = await db.select().from(contentSources).orderBy(contentSources.createdAt);
    res.json(sources);
  });

  app.post("/api/admin/sources", async (req, res) => {
    const { title, url, description } = req.body;
    const id = randomUUID();
    await db.insert(contentSources).values({
      id,
      title,
      url,
      description,
      isActive: true,
    });
    res.json({ id, title, url, description });
  });

  app.delete("/api/admin/sources/:id", async (req, res) => {
    await db.delete(contentSources).where(eq(contentSources.id, req.params.id));
    res.json({ success: true });
  });

  app.get("/api/admin/topics", async (req, res) => {
    const allTopics = await db.select().from(topics).orderBy(topics.order);
    res.json(allTopics);
  });

  // Unlock all topics (for testing)
  app.post("/api/admin/topics/unlock-all", async (req, res) => {
    await db.update(topics).set({ unlockDay: 1 });
    res.json({ success: true, message: "All topics unlocked (unlockDay set to 1)" });
  });

  /**
   * Quick Create Topic: Unified endpoint that creates source + topic + generates lessons
   * This is the self-service way to add new topics from URLs
   */
  app.post("/api/admin/topics/create-from-url", async (req, res) => {
    let topicId: string | undefined;
    let sourceId: string | undefined;

    try {
      const { topicTitle, url, description, unlockDay } = req.body;

      if (!topicTitle || !url) {
        return res.status(400).json({ error: "Topic title and URL are required" });
      }

      // Validate URL
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      // Check if Anthropic is configured
      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(400).json({
          error: "ANTHROPIC_API_KEY not configured. Set it in .env to enable AI lesson generation.",
        });
      }

      // Step 1: Scrape content from URL
      let scrapedContent = "";
      try {
        scrapedContent = await scrapeUrlContent(url);
        if (scrapedContent.length < 500) {
          return res.status(400).json({
            error: "Insufficient content extracted from URL. Make sure the URL contains readable text content.",
          });
        }
      } catch (scrapeError: any) {
        return res.status(400).json({
          error: `Failed to scrape URL: ${scrapeError.message}`,
        });
      }

      // Step 2: Create content source
      sourceId = randomUUID();
      await db.insert(contentSources).values({
        id: sourceId,
        title: topicTitle,
        description: description || `Source for: ${topicTitle}`,
        url,
        isActive: true,
      });

      // Step 3: Create topic
      topicId = randomUUID();
      const maxOrder = await db.select().from(topics);
      await db.insert(topics).values({
        id: topicId,
        title: topicTitle,
        description: description || `Learn about ${topicTitle}`,
        sourceId,
        order: maxOrder.length,
        isActive: true,
        unlockDay: unlockDay || 1,
      });

      // Step 4: Generate lessons using AI
      let generatedConcepts = 0;
      let generatedQuestions = 0;
      let errorMessage = null;

      try {
        const { generateLessonFromContent, generateAnalogy } = await import("./ai-service");
        const lessons = await generateLessonFromContent(scrapedContent, topicTitle);

        // Save concepts (theory cards)
        for (const concept of lessons.concepts) {
          const conceptId = randomUUID();
          const existingConcepts = await db
            .select()
            .from(concepts)
            .where(eq(concepts.topicId, topicId));

          await db.insert(concepts).values({
            id: conceptId,
            topicId,
            title: concept.title,
            content: concept.content,
            keyTakeaway: concept.keyTakeaway,
            difficulty: concept.difficulty || "beginner",
            order: existingConcepts.length,
            isActive: true,
          });
          generatedConcepts++;

          // Generate analogy for each concept
          try {
            const analogy = await generateAnalogy(concept.title, concept.content);
            // Store analogy in concept content (we can enhance schema later if needed)
            // For now, append to content
            await db
              .update(concepts)
              .set({
                content: `${concept.content}\n\n## Real-World Example\n\n**${analogy.title}**\n\n${analogy.scenario}\n\n${analogy.explanation}\n\n**Application:** ${analogy.realWorldApplication}`,
              })
              .where(eq(concepts.id, conceptId));
          } catch (analogyError: any) {
            console.warn("Analogy generation failed for concept:", concept.title, analogyError.message);
            // Continue without analogy
          }
        }

        // Save questions (quiz cards)
        // Map questions to concepts (assign to first concept for now, can be improved)
        const topicConcepts = await db
          .select()
          .from(concepts)
          .where(eq(concepts.topicId, topicId));

        let conceptIndex = 0;
        for (const question of lessons.questions) {
          if (topicConcepts.length === 0) break;

          const conceptId = topicConcepts[conceptIndex % topicConcepts.length].id;
          const questionId = randomUUID();

          await db.insert(conceptQuestions).values({
            id: questionId,
            conceptId,
            scenario: question.scenario || "",
            question: question.question,
            options: question.options,
            correctIndex: question.correctIndex,
            explanation: question.explanation,
            difficulty: question.difficulty || "beginner",
            creditsReward: 10,
            isActive: true,
          });
          generatedQuestions++;
          conceptIndex++;
        }
      } catch (aiError: any) {
        console.error("AI generation error:", aiError);
        errorMessage = aiError.message;
        // Continue - source and topic are created, just AI generation failed
      }

      res.json({
        success: true,
        message: "Topic created successfully",
        topicId,
        sourceId,
        scrapedLength: scrapedContent.length,
        generatedConcepts,
        generatedQuestions,
        unlockDay: unlockDay || 1,
        error: errorMessage,
        note: errorMessage
          ? "Topic and source created, but AI lesson generation failed. You can manually add concepts and questions."
          : `Topic created with ${generatedConcepts} concepts and ${generatedQuestions} questions.`,
      });
    } catch (error: any) {
      console.error("Quick create topic error:", error);
      console.error("Error stack:", error.stack);
      // Rollback: Delete topic and source if they were created
      try {
        if (topicId) {
          await db.delete(topics).where(eq(topics.id, topicId));
        }
        if (sourceId) {
          await db.delete(contentSources).where(eq(contentSources.id, sourceId));
        }
      } catch (rollbackError: any) {
        console.error("Rollback error:", rollbackError);
      }
      res.status(500).json({ 
        error: error.message || "Failed to create topic",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  });

  app.post("/api/admin/topics", async (req, res) => {
    const { title, description, sourceId, unlockDay } = req.body;
    const id = randomUUID();
    const maxOrder = await db.select().from(topics);
    await db.insert(topics).values({
      id,
      title,
      description,
      sourceId,
      order: maxOrder.length,
      isActive: true,
      unlockDay: unlockDay || 1, // Default to Day 1 if not specified
    });
    res.json({ id, title, description, sourceId, unlockDay: unlockDay || 1 });
  });

  app.put("/api/admin/topics/:id", async (req, res) => {
    const { title, description, isActive, unlockDay } = req.body;
    const updateData: any = { title, description, isActive };
    if (unlockDay !== undefined) {
      updateData.unlockDay = unlockDay;
    }
    await db.update(topics)
      .set(updateData)
      .where(eq(topics.id, req.params.id));
    res.json({ success: true });
  });

  app.delete("/api/admin/topics/:id", async (req, res) => {
    await db.delete(topics).where(eq(topics.id, req.params.id));
    res.json({ success: true });
  });

  app.get("/api/admin/topics/:topicId/concepts", async (req, res) => {
    const topicConcepts = await db.select()
      .from(concepts)
      .where(eq(concepts.topicId, req.params.topicId))
      .orderBy(concepts.order);
    res.json(topicConcepts);
  });

  app.get("/api/admin/concepts", async (req, res) => {
    const allConcepts = await db.select().from(concepts).orderBy(concepts.order);
    res.json(allConcepts);
  });

  app.post("/api/admin/concepts", async (req, res) => {
    const { topicId, title, content, keyTakeaway, difficulty } = req.body;
    const id = randomUUID();
    const existing = await db.select().from(concepts).where(eq(concepts.topicId, topicId));
    await db.insert(concepts).values({
      id,
      topicId,
      title,
      content,
      keyTakeaway,
      difficulty: difficulty || "beginner",
      order: existing.length,
      isActive: true,
    });
    res.json({ id, topicId, title, content, keyTakeaway, difficulty });
  });

  app.put("/api/admin/concepts/:id", async (req, res) => {
    const { title, content, keyTakeaway, difficulty, isActive } = req.body;
    await db.update(concepts)
      .set({ title, content, keyTakeaway, difficulty, isActive })
      .where(eq(concepts.id, req.params.id));
    res.json({ success: true });
  });

  app.delete("/api/admin/concepts/:id", async (req, res) => {
    await db.delete(conceptQuestions).where(eq(conceptQuestions.conceptId, req.params.id));
    await db.delete(concepts).where(eq(concepts.id, req.params.id));
    res.json({ success: true });
  });

  app.get("/api/admin/concepts/:conceptId/questions", async (req, res) => {
    const questions = await db.select()
      .from(conceptQuestions)
      .where(eq(conceptQuestions.conceptId, req.params.conceptId));
    res.json(questions);
  });

  app.get("/api/admin/questions", async (req, res) => {
    const allQuestions = await db.select().from(conceptQuestions);
    res.json(allQuestions);
  });

  app.post("/api/admin/questions", async (req, res) => {
    const { conceptId, scenario, question, options, correctIndex, explanation, difficulty, creditsReward } = req.body;
    const id = randomUUID();
    await db.insert(conceptQuestions).values({
      id,
      conceptId,
      scenario,
      question,
      options,
      correctIndex,
      explanation,
      difficulty: difficulty || "beginner",
      creditsReward: creditsReward || 10,
      isActive: true,
    });
    res.json({ id, conceptId, question });
  });

  app.put("/api/admin/questions/:id", async (req, res) => {
    const { scenario, question, options, correctIndex, explanation, difficulty, creditsReward, isActive } = req.body;
    await db.update(conceptQuestions)
      .set({ scenario, question, options, correctIndex, explanation, difficulty, creditsReward, isActive })
      .where(eq(conceptQuestions.id, req.params.id));
    res.json({ success: true });
  });

  app.delete("/api/admin/questions/:id", async (req, res) => {
    await db.delete(conceptQuestions).where(eq(conceptQuestions.id, req.params.id));
    res.json({ success: true });
  });

  app.get("/api/admin/stats", async (req, res) => {
    const sourceCount = await db.select().from(contentSources);
    const topicCount = await db.select().from(topics);
    const conceptCount = await db.select().from(concepts);
    const questionCount = await db.select().from(conceptQuestions);
    res.json({
      sources: sourceCount.length,
      topics: topicCount.length,
      concepts: conceptCount.length,
      questions: questionCount.length,
    });
  });
}
