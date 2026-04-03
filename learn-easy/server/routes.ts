import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { registerAdminRoutes } from "./admin-routes";
import { registerAuthRoutes, requireAuth } from "./auth-routes";
import { db } from "./db";
import { concepts, conceptQuestions, users, userTopicProgress, userDailyStats, learningPlans, topicComments, topics } from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { supabaseAdminClient } from "./supabase";

const DAILY_GOALS = {
  questionsAnswered: 5,
  lessonsCompleted: 2,
  creditsEarned: 30,
} as const;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint (for load balancer)
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });
  
  // Register authentication routes first
  registerAuthRoutes(app);
  
  // Helper to get current user (with fallback for backward compatibility)
  async function getCurrentUser(req: any) {
    if (req.session?.userId) {
      const user = await storage.getUser(req.session.userId);
      if (user) return user;
    }

    // Optional Supabase bearer-token authentication for hosted mode.
    const authHeader = req.headers?.authorization;
    if (authHeader?.startsWith("Bearer ") && supabaseAdminClient) {
      const token = authHeader.slice("Bearer ".length).trim();
      if (token) {
        const { data, error } = await supabaseAdminClient.auth.getUser(token);
        if (!error && data.user) {
          const supabaseUser = data.user;
          let user = await storage.getUser(supabaseUser.id);

          if (!user) {
            const preferredUsername =
              (supabaseUser.user_metadata?.full_name as string | undefined)?.trim() ||
              (supabaseUser.email ? supabaseUser.email.split("@")[0] : undefined) ||
              `user-${supabaseUser.id.slice(0, 8)}`;
            const existingByName = await storage.getUserByUsername(preferredUsername);
            const safeUsername = existingByName
              ? `${preferredUsername}-${supabaseUser.id.slice(0, 6)}`
              : preferredUsername;

            await db.insert(users).values({
              id: supabaseUser.id,
              username: safeUsername,
              credits: 0,
              streak: 0,
              totalCorrect: 0,
              totalAnswered: 0,
              currentLevel: "beginner",
              startDate: new Date(),
            });
            user = await storage.getUser(supabaseUser.id);
          }

          if (user && req.session) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.isAdmin = false;
            return user;
          }
        }
      }
    }
    // Fallback to default user for backward compatibility
    return await (storage as any).getDefaultUser();
  }

  function getTodayKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function getOrCreateDailyStatsRow(userId: string) {
    const dateKey = getTodayKey();
    const existing = await db
      .select()
      .from(userDailyStats)
      .where(and(eq(userDailyStats.userId, userId), eq(userDailyStats.dateKey, dateKey)))
      .limit(1);

    if (existing[0]) {
      return existing[0];
    }

    const [created] = await db
      .insert(userDailyStats)
      .values({
        id: randomUUID(),
        userId,
        dateKey,
        questionsAnswered: 0,
        correctAnswers: 0,
        lessonsCompleted: 0,
        creditsEarned: 0,
      })
      .returning();

    return created;
  }

  async function getDailyLockStatusForUser(userId: string) {
    const row = await getOrCreateDailyStatsRow(userId);

    const remaining = {
      questionsAnswered: Math.max(0, DAILY_GOALS.questionsAnswered - row.questionsAnswered),
      lessonsCompleted: Math.max(0, DAILY_GOALS.lessonsCompleted - row.lessonsCompleted),
      creditsEarned: Math.max(0, DAILY_GOALS.creditsEarned - row.creditsEarned),
    };

    const completedGoals = [
      remaining.questionsAnswered === 0,
      remaining.lessonsCompleted === 0,
      remaining.creditsEarned === 0,
    ].filter(Boolean).length;

    return {
      dateKey: row.dateKey,
      goals: DAILY_GOALS,
      stats: {
        questionsAnswered: row.questionsAnswered,
        correctAnswers: row.correctAnswers,
        lessonsCompleted: row.lessonsCompleted,
        creditsEarned: row.creditsEarned,
      },
      remaining,
      completedGoals,
      totalGoals: 3,
      isLocked: completedGoals < 3,
    };
  }

  app.get("/api/user/credits", async (req, res) => {
    const user = await getCurrentUser(req);
    res.json({ credits: user.credits });
  });

  app.post("/api/user/set-name", async (req, res) => {
    const { username } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }
    const user = await getCurrentUser(req);
    await (storage as any).updateUsername(user.id, username.trim());
    
    // Update session if exists
    if (req.session) {
      req.session.username = username.trim();
    }
    
    res.json({ success: true });
  });

  // ── Topic selection ──────────────────────────────────────────────────────
  app.post("/api/select-topic", async (req, res) => {
    const { topicId } = req.body;
    (req.session as any).selectedTopicId = topicId || null;
    (req.session as any).dbTopicCardIndex = 0;
    (req.session as any).dbTopicCompletedIds = [];
    res.json({ success: true });
  });

  // Build LearningCard array from DB concepts + questions for a topic
  async function buildDbTopicCards(topicId: string, topicTitle: string) {
    const dbConcepts = await db
      .select()
      .from(concepts)
      .where(and(eq(concepts.topicId, topicId), eq(concepts.isActive, true)))
      .orderBy(concepts.order);

    const cards: any[] = [];
    for (let i = 0; i < dbConcepts.length; i++) {
      const concept = dbConcepts[i];
      // Concept card
      cards.push({
        id: `${concept.id}-concept`,
        type: "concept",
        topicId,
        topic: topicTitle,
        difficulty: concept.difficulty,
        lessonIndex: i,
        stepInLesson: 0,
        concept: {
          title: concept.title,
          content: concept.content,
          keyTakeaway: concept.keyTakeaway,
        },
      });

      // Question cards for this concept
      const qs = await db
        .select()
        .from(conceptQuestions)
        .where(and(eq(conceptQuestions.conceptId, concept.id), eq(conceptQuestions.isActive, true)));

      for (let j = 0; j < qs.length; j++) {
        const q = qs[j];
        cards.push({
          id: `${q.id}-question`,
          type: "question",
          topicId,
          topic: topicTitle,
          difficulty: q.difficulty,
          lessonIndex: i,
          stepInLesson: j + 1,
          question: {
            id: q.id,
            lessonId: concept.id,
            scenario: q.scenario || "",
            question: q.question,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation,
            difficulty: q.difficulty,
            creditsReward: q.creditsReward,
          },
        });
      }
    }
    return cards;
  }

  app.get("/api/learn", async (req, res) => {
    const user = await getCurrentUser(req);
    const selectedTopicId = (req.session as any).selectedTopicId as string | undefined;

    // Check if selected topic has DB concepts → serve DB-based cards
    if (selectedTopicId) {
      const [dbTopic] = await db.select().from(topics).where(eq(topics.id, selectedTopicId)).limit(1);
      if (dbTopic) {
        const cards = await buildDbTopicCards(selectedTopicId, dbTopic.title);
        if (cards.length > 0) {
          const cardIndex = ((req.session as any).dbTopicCardIndex as number) ?? 0;
          const safeIndex = Math.min(cardIndex, cards.length);
          const currentCard = safeIndex < cards.length ? cards[safeIndex] : null;
          const completedIds: string[] = (req.session as any).dbTopicCompletedIds ?? [];
          const todayProgress = await (storage as any).getTodayProgress();
          const dailyPlan = await (storage as any).getDailyPlan();
          return res.json({
            user,
            currentCard,
            streak: user.streak,
            todayProgress,
            totalCards: cards.length,
            dailyPlan,
            isInReviewMode: false,
            dbTopic: true,
            cardIndex: safeIndex,
          });
        }
      }
    }

    // Default: in-memory (AI Agents) flow
    const isInReviewMode = await (storage as any).getIsInReviewMode();

    let currentCard;
    if (isInReviewMode) {
      currentCard = await (storage as any).getCurrentReviewCard();
      if (!currentCard) {
        await (storage as any).exitReviewMode();
      }
    }

    if (!isInReviewMode || !currentCard) {
      currentCard = await (storage as any).getCurrentLearningCard();
    }

    const todayProgress = await (storage as any).getTodayProgress();
    const totalCards = await (storage as any).getTotalCards();
    const dailyPlan = await (storage as any).getDailyPlan();

    res.json({
      user,
      currentCard,
      streak: user.streak,
      todayProgress,
      totalCards,
      dailyPlan,
      isInReviewMode: await (storage as any).getIsInReviewMode(),
    });
  });

  app.get("/api/daily-plan", async (req, res) => {
    const dailyPlan = await (storage as any).getDailyPlan();
    res.json(dailyPlan);
  });

  app.get("/api/topics", async (req, res) => {
    const user = await getCurrentUser(req);
    
    // Use new topic unlock logic
    const { getTopicsWithUnlockStatus, getTopicUnlockDate } = await import("./topic-unlock");
    const topicsWithStatus = await getTopicsWithUnlockStatus(user);
    const dailyLock = await getDailyLockStatusForUser(user.id);
    const currentTopicId = await (storage as any).getCurrentTopicId?.();
    const currentTopicIsInDbTopics = topicsWithStatus.some((t) => t.id === currentTopicId);
    const shouldApplySessionLockToTopics = dailyLock.isLocked && currentTopicIsInDbTopics;
    
    // Load persisted per-topic progress for the current user
    const topicProgressRows = await db
      .select()
      .from(userTopicProgress)
      .where(eq(userTopicProgress.userId, user.id));
    const topicProgressByTopicId = new Map(topicProgressRows.map((row) => [row.topicId, row]));
    
    // Format for frontend with lesson counts
    const topics = await Promise.all(
      topicsWithStatus.map(async (topic) => {
        // Count concepts (lessons) for this topic
        const topicConcepts = await db
          .select()
          .from(concepts)
          .where(and(eq(concepts.topicId, topic.id), eq(concepts.isActive, true)));
        
        const lessonCount = topicConcepts.length;
        const topicProgress = topicProgressByTopicId.get(topic.id);
        const completedLessons = Math.min(topicProgress?.completedLessons ?? 0, lessonCount);
        const lockedBySession =
          shouldApplySessionLockToTopics && topic.id !== currentTopicId && !topic.isLocked;
        
        return {
          id: topic.id,
          title: topic.title,
          description: topic.description || "",
          audience: "all" as const, // Default audience
          lessonCount,
          completedLessons,
          isLocked: topic.isLocked || lockedBySession,
          unlocksAt: topic.isLocked ? getTopicUnlockDate(user, topic.unlocksOnDay) : null,
          unlocksOnDay: topic.unlocksOnDay,
          unlockDate: topic.isLocked ? getTopicUnlockDate(user, topic.unlocksOnDay) : null,
          lockReason: lockedBySession ? "Complete today's goals to unlock more topics." : null,
        };
      })
    );
    
    // Also include in-memory topics (AI Agents etc.) from MemStorage
    const memTopics = await storage.getTopics();
    const dbTopicIds = new Set(topics.map(t => t.id));
    const memOnlyTopics = memTopics
      .filter(t => !dbTopicIds.has(t.id))
      .map(t => ({
        id: t.id,
        title: t.title,
        description: t.description || "",
        audience: (t.audience || "all") as "all" | "developer" | "product-owner",
        lessonCount: t.lessonCount ?? 0,
        completedLessons: t.completedLessons ?? 0,
        isLocked: t.isLocked ?? false,
        unlocksAt: null,
        unlocksOnDay: 1,
        unlockDate: null,
        lockReason: null,
      }));

    res.json({
      topics: [...memOnlyTopics, ...topics],
      sessionLock: {
        ...dailyLock,
        appliedToTopics: shouldApplySessionLockToTopics,
      },
    });
  });

  app.post("/api/start-review", async (req, res) => {
    await (storage as any).startReviewMode();
    res.json({ success: true });
  });

  app.post("/api/exit-review", async (req, res) => {
    await (storage as any).exitReviewMode();
    res.json({ success: true });
  });

  app.post("/api/next-card", async (req, res) => {
    const user = await getCurrentUser(req);
    const selectedTopicId = (req.session as any).selectedTopicId as string | undefined;

    // DB-topic path
    if (selectedTopicId) {
      const [dbTopic] = await db.select().from(topics).where(eq(topics.id, selectedTopicId)).limit(1);
      if (dbTopic) {
        const cards = await buildDbTopicCards(selectedTopicId, dbTopic.title);
        if (cards.length > 0) {
          const cardIndex = ((req.session as any).dbTopicCardIndex as number) ?? 0;
          const currentCard = cards[cardIndex];
          const newIndex = Math.min(cardIndex + 1, cards.length);
          (req.session as any).dbTopicCardIndex = newIndex;

          if (currentCard?.type === "question") {
            const completedIds: string[] = (req.session as any).dbTopicCompletedIds ?? [];
            if (!completedIds.includes(currentCard.id)) completedIds.push(currentCard.id);
            (req.session as any).dbTopicCompletedIds = completedIds;

            const todayRow = await getOrCreateDailyStatsRow(user.id);
            await db.update(userDailyStats).set({ lessonsCompleted: todayRow.lessonsCompleted + 1 }).where(eq(userDailyStats.id, todayRow.id));

            const totalQCards = cards.filter((c: any) => c.type === "question").length;
            const completedQCards = completedIds.filter((id) => cards.find((c: any) => c.id === id && c.type === "question")).length;
            const completionPercentage = totalQCards > 0 ? Math.round((completedQCards / totalQCards) * 100) : 0;
            const userAccuracy = user.totalAnswered > 0 ? (user.totalCorrect / user.totalAnswered) * 100 : 0;
            const expertiseLevel = userAccuracy >= 90 ? "advanced" : userAccuracy >= 70 ? "intermediate" : "beginner";

            const [existing] = await db.select().from(userTopicProgress).where(and(eq(userTopicProgress.userId, user.id), eq(userTopicProgress.topicId, selectedTopicId))).limit(1);
            if (existing) {
              await db.update(userTopicProgress).set({ expertiseLevel, completionPercentage, totalLessons: totalQCards, completedLessons: completedQCards, totalCorrect: user.totalCorrect, totalAnswered: user.totalAnswered, lastActivityAt: new Date() }).where(eq(userTopicProgress.id, existing.id));
            } else {
              await db.insert(userTopicProgress).values({ id: randomUUID(), userId: user.id, topicId: selectedTopicId, expertiseLevel, completionPercentage, totalLessons: totalQCards, completedLessons: completedQCards, totalCorrect: user.totalCorrect, totalAnswered: user.totalAnswered, lastActivityAt: new Date(), createdAt: new Date() });
            }
          }
          return res.json({ success: true });
        }
      }
    }

    const isInReviewMode = await (storage as any).getIsInReviewMode();
    const currentCard = isInReviewMode
      ? await (storage as any).getCurrentReviewCard()
      : await (storage as any).getCurrentLearningCard();

    await (storage as any).advanceToNextCard();

    // Track lesson completion and per-topic completion whenever a quiz card is completed.
    if (currentCard?.type === "question") {
      const todayRow = await getOrCreateDailyStatsRow(user.id);
      await db
        .update(userDailyStats)
        .set({
          lessonsCompleted: todayRow.lessonsCompleted + 1,
        })
        .where(eq(userDailyStats.id, todayRow.id));

      const cards: Array<any> = (storage as any).learningCards || [];
      const completedCardIds: Set<string> = (storage as any).completedCardIds || new Set<string>();
      const questionCardsForTopic = cards.filter(
        (card: any) => card.topicId === currentCard.topicId && card.type === "question"
      );
      const completedQuestionsForTopic = questionCardsForTopic.filter((card: any) =>
        completedCardIds.has(card.id)
      ).length;
      const totalLessons = questionCardsForTopic.length;
      const completionPercentage =
        totalLessons > 0
          ? Math.round((completedQuestionsForTopic / totalLessons) * 100)
          : 0;
      const userAccuracy =
        user.totalAnswered > 0 ? (user.totalCorrect / user.totalAnswered) * 100 : 0;
      const expertiseLevel =
        userAccuracy >= 90 ? "advanced" : userAccuracy >= 70 ? "intermediate" : "beginner";

      const existingTopicProgress = await db
        .select()
        .from(userTopicProgress)
        .where(
          and(
            eq(userTopicProgress.userId, user.id),
            eq(userTopicProgress.topicId, currentCard.topicId)
          )
        )
        .limit(1);

      if (existingTopicProgress[0]) {
        await db
          .update(userTopicProgress)
          .set({
            expertiseLevel,
            completionPercentage,
            totalLessons,
            completedLessons: completedQuestionsForTopic,
            totalCorrect: user.totalCorrect,
            totalAnswered: user.totalAnswered,
            lastActivityAt: new Date(),
          })
          .where(eq(userTopicProgress.id, existingTopicProgress[0].id));
      } else {
        await db.insert(userTopicProgress).values({
          id: randomUUID(),
          userId: user.id,
          topicId: currentCard.topicId,
          expertiseLevel,
          completionPercentage,
          totalLessons,
          completedLessons: completedQuestionsForTopic,
          totalCorrect: user.totalCorrect,
          totalAnswered: user.totalAnswered,
          lastActivityAt: new Date(),
          createdAt: new Date(),
        });
      }
    }

    res.json({ success: true });
  });

  app.get("/api/dashboard", async (req, res) => {
    const user = await getCurrentUser(req);
    const modules = await storage.getModules();
    const completedLessonIds = await storage.getCompletedLessonIds();
    
    const modulesWithProgress = await Promise.all(
      modules.map(async (module) => {
        const lessons = await storage.getLessons(module.id);
        const completed = lessons.filter(l => completedLessonIds.includes(l.id)).length;
        return {
          ...module,
          progress: { completed, total: lessons.length }
        };
      })
    );

    const current = await (storage as any).getFirstUncompletedLesson();
    
    const today = new Date().getDay();
    const activeDays = [today];
    if (user.streak > 1) {
      for (let i = 1; i < Math.min(user.streak, 7); i++) {
        activeDays.push((today - i + 7) % 7);
      }
    }

    res.json({
      user,
      modules: modulesWithProgress,
      currentModule: current?.module || null,
      currentLesson: current?.lesson ? { 
        id: current.lesson.id, 
        title: current.lesson.title,
        moduleId: current.lesson.moduleId 
      } : null,
      activeDays,
    });
  });

  app.get("/api/modules", async (req, res) => {
    const modules = await storage.getModules();
    const completedLessonIds = await storage.getCompletedLessonIds();
    
    const modulesWithProgress = await Promise.all(
      modules.map(async (module) => {
        const lessons = await storage.getLessons(module.id);
        const completed = lessons.filter(l => completedLessonIds.includes(l.id)).length;
        return {
          ...module,
          progress: { completed, total: lessons.length }
        };
      })
    );

    res.json({ modules: modulesWithProgress });
  });

  app.get("/api/modules/:id", async (req, res) => {
    const module = await storage.getModule(req.params.id);
    if (!module) {
      return res.status(404).json({ error: "Module not found" });
    }

    const lessons = await storage.getLessons(module.id);
    const completedLessonIds = await storage.getCompletedLessonIds();
    
    const lessonsWithCompletion = lessons.map(lesson => ({
      ...lesson,
      completed: completedLessonIds.includes(lesson.id)
    }));

    const completed = lessonsWithCompletion.filter(l => l.completed).length;

    res.json({
      module,
      lessons: lessonsWithCompletion,
      progress: { completed, total: lessons.length }
    });
  });

  app.get("/api/lessons/:id", async (req, res) => {
    const lesson = await storage.getLesson(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const questions = await storage.getQuestions(lesson.id);
    const nextLesson = await (storage as any).getNextLesson(lesson.id);
    const moduleLessons = await storage.getLessons(lesson.moduleId);

    res.json({
      lesson,
      questions,
      nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title } : null,
      moduleLessons: moduleLessons.map(l => ({ id: l.id, title: l.title }))
    });
  });

  app.post("/api/answer", async (req, res) => {
    const { questionId, isCorrect, creditsEarned, lessonIndex } = req.body;
    
    const user = await getCurrentUser(req);
    await storage.updateUserStats(user.id, isCorrect);
    
    await (storage as any).recordAnswer(questionId, lessonIndex || 0, isCorrect);
    
    if (creditsEarned > 0) {
      await storage.updateUserCredits(user.id, creditsEarned);
      await (storage as any).onCreditsEarned(creditsEarned);
    }

    const todayRow = await getOrCreateDailyStatsRow(user.id);
    await db
      .update(userDailyStats)
      .set({
        questionsAnswered: todayRow.questionsAnswered + 1,
        correctAnswers: todayRow.correctAnswers + (isCorrect ? 1 : 0),
        creditsEarned: todayRow.creditsEarned + Math.max(0, creditsEarned || 0),
      })
      .where(eq(userDailyStats.id, todayRow.id));

    const accuracy = user.totalAnswered > 0 
      ? (user.totalCorrect / user.totalAnswered) * 100 
      : 0;

    if (accuracy >= 80 && user.currentLevel === "beginner") {
      await storage.updateUserLevel(user.id, "intermediate");
    } else if (accuracy >= 90 && user.currentLevel === "intermediate") {
      await storage.updateUserLevel(user.id, "advanced");
    }

    res.json({ success: true });
  });

  app.get("/api/daily-lock-status", async (req, res) => {
    const user = await getCurrentUser(req);
    const lock = await getDailyLockStatusForUser(user.id);
    res.json(lock);
  });

  app.get("/api/learning-stats", async (req, res) => {
    const user = await getCurrentUser(req);
    const { getTopicsWithUnlockStatus } = await import("./topic-unlock");
    const topicsWithStatus = await getTopicsWithUnlockStatus(user);
    const topicProgressRows = await db
      .select()
      .from(userTopicProgress)
      .where(eq(userTopicProgress.userId, user.id));
    const topicProgressByTopicId = new Map(topicProgressRows.map((row) => [row.topicId, row]));
    const dailyLock = await getDailyLockStatusForUser(user.id);

    let completedTopics = 0;
    let inProgressTopics = 0;
    let notStartedTopics = 0;

    for (const topic of topicsWithStatus) {
      const progress = topicProgressByTopicId.get(topic.id);
      const completion = progress?.completionPercentage ?? 0;

      if (completion >= 100) {
        completedTopics += 1;
      } else if (completion > 0) {
        inProgressTopics += 1;
      } else {
        notStartedTopics += 1;
      }
    }

    const unlockedTopics = topicsWithStatus.filter((t) => !t.isLocked).length;
    const lockedTopics = topicsWithStatus.length - unlockedTopics;
    const accuracy =
      user.totalAnswered > 0 ? Math.round((user.totalCorrect / user.totalAnswered) * 100) : 0;

    res.json({
      totalTopics: topicsWithStatus.length,
      completedTopics,
      inProgressTopics,
      notStartedTopics,
      unlockedTopics,
      lockedTopics,
      accuracy,
      totalAnswered: user.totalAnswered,
      totalCorrect: user.totalCorrect,
      dailyLock,
      nextGoals: [
        dailyLock.remaining.questionsAnswered > 0
          ? `Answer ${dailyLock.remaining.questionsAnswered} more questions`
          : null,
        dailyLock.remaining.lessonsCompleted > 0
          ? `Complete ${dailyLock.remaining.lessonsCompleted} more lessons`
          : null,
        dailyLock.remaining.creditsEarned > 0
          ? `Earn ${dailyLock.remaining.creditsEarned} more credits`
          : null,
      ].filter(Boolean),
    });
  });

  app.get("/api/leaderboard", async (_req, res) => {
    const allUsers = await db.select().from(users);
    const todayKey = getTodayKey();
    const allTopicProgress = await db.select().from(userTopicProgress);
    const allDailyStats = await db
      .select()
      .from(userDailyStats)
      .where(eq(userDailyStats.dateKey, todayKey));

    const topicProgressByUser = new Map<string, Array<(typeof allTopicProgress)[number]>>();
    for (const row of allTopicProgress) {
      const existing = topicProgressByUser.get(row.userId) || [];
      existing.push(row);
      topicProgressByUser.set(row.userId, existing);
    }

    const dailyStatsByUser = new Map(allDailyStats.map((row) => [row.userId, row]));

    const ranked = allUsers
      .map((user) => {
        const progressRows = topicProgressByUser.get(user.id) || [];
        const completedTopics = progressRows.filter((row) => row.completionPercentage >= 100).length;
        const avgCompletion =
          progressRows.length > 0
            ? Math.round(
                progressRows.reduce((sum, row) => sum + row.completionPercentage, 0) /
                  progressRows.length
              )
            : 0;
        const accuracy =
          user.totalAnswered > 0 ? Math.round((user.totalCorrect / user.totalAnswered) * 100) : 0;
        const daily = dailyStatsByUser.get(user.id);
        const dailyGoalProgress = daily
          ? Math.round(
              ((Math.min(1, daily.questionsAnswered / DAILY_GOALS.questionsAnswered) +
                Math.min(1, daily.lessonsCompleted / DAILY_GOALS.lessonsCompleted) +
                Math.min(1, daily.creditsEarned / DAILY_GOALS.creditsEarned)) /
                3) *
                100
            )
          : 0;

        const score =
          completedTopics * 1000 +
          avgCompletion * 10 +
          accuracy * 5 +
          user.credits +
          user.streak * 20;

        return {
          userId: user.id,
          username: user.username,
          credits: user.credits,
          streak: user.streak,
          accuracy,
          completedTopics,
          avgCompletion,
          dailyGoalProgress,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));

    res.json({
      generatedAt: new Date().toISOString(),
      entries: ranked,
    });
  });

  app.post("/api/complete-lesson", async (req, res) => {
    const { lessonId, correctAnswers, totalQuestions } = req.body;
    
    const lesson = await storage.getLesson(lessonId);
    if (!lesson) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    await storage.completeLesson(lessonId, lesson.moduleId, correctAnswers, totalQuestions);

    const user = await getCurrentUser(req);
    await storage.updateUserStreak(user.id, user.streak + 1);

    res.json({ success: true });
  });

  app.get("/api/progress", async (req, res) => {
    const user = await getCurrentUser(req);
    const modules = await storage.getModules();
    const completedLessonIds = await storage.getCompletedLessonIds();
    
    let totalLessons = 0;
    for (const module of modules) {
      const lessons = await storage.getLessons(module.id);
      totalLessons += lessons.length;
    }

    const today = new Date().getDay();
    const activeDays = [today];
    if (user.streak > 1) {
      for (let i = 1; i < Math.min(user.streak, 7); i++) {
        activeDays.push((today - i + 7) % 7);
      }
    }

    const recentActivity = [
      { date: "Today", lessonsCompleted: 2, creditsEarned: 35 },
      { date: "Yesterday", lessonsCompleted: 1, creditsEarned: 25 },
      { date: "2 days ago", lessonsCompleted: 3, creditsEarned: 50 },
    ];

    res.json({
      user,
      totalLessons,
      completedLessons: completedLessonIds.length,
      activeDays,
      recentActivity,
    });
  });

  app.get("/api/profile", async (req, res) => {
    const user = await getCurrentUser(req);
    const modules = await storage.getModules();
    const completedLessonIds = await storage.getCompletedLessonIds();
    
    let totalLessons = 0;
    for (const module of modules) {
      const lessons = await storage.getLessons(module.id);
      totalLessons += lessons.length;
    }

    const achievements = [
      {
        id: "first-lesson",
        title: "First Steps",
        description: "Complete your first lesson",
        earned: completedLessonIds.length >= 1,
      },
      {
        id: "five-streak",
        title: "On Fire",
        description: "Maintain a 5-day learning streak",
        earned: user.streak >= 5,
      },
      {
        id: "perfect-score",
        title: "Perfect Score",
        description: "Get 100% on a lesson",
        earned: user.totalCorrect > 0 && user.totalCorrect === user.totalAnswered,
      },
      {
        id: "module-master",
        title: "Module Master",
        description: "Complete an entire module",
        earned: false,
      },
      {
        id: "credit-collector",
        title: "Credit Collector",
        description: "Earn 500 credits",
        earned: user.credits >= 500,
      },
      {
        id: "ai-enthusiast",
        title: "AI Enthusiast",
        description: "Complete 10 lessons",
        earned: completedLessonIds.length >= 10,
      },
    ];

    res.json({
      user,
      achievements,
      stats: {
        totalLessons,
        completedLessons: completedLessonIds.length,
        totalQuestions: user.totalAnswered,
        correctAnswers: user.totalCorrect,
      },
    });
  });

  // ── Topic detail (concepts list + progress) ──
  app.get("/api/topics/:topicId/detail", async (req, res) => {
    const user = await getCurrentUser(req);
    const { topicId } = req.params;

    const [topic] = await db.select().from(topics).where(eq(topics.id, topicId)).limit(1);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const topicConcepts = await db
      .select()
      .from(concepts)
      .where(and(eq(concepts.topicId, topicId), eq(concepts.isActive, true)))
      .orderBy(concepts.order);

    const [progress] = await db
      .select()
      .from(userTopicProgress)
      .where(and(eq(userTopicProgress.userId, user.id), eq(userTopicProgress.topicId, topicId)))
      .limit(1);

    res.json({
      topic,
      concepts: topicConcepts.map((c) => ({
        id: c.id,
        title: c.title,
        keyTakeaway: c.keyTakeaway,
        difficulty: c.difficulty,
        order: c.order,
      })),
      progress: progress || null,
    });
  });

  // ── Topic Comments (Social Layer) ──
  app.get("/api/topics/:topicId/comments", async (req, res) => {
    const comments = await db
      .select()
      .from(topicComments)
      .where(eq(topicComments.topicId, req.params.topicId))
      .orderBy(desc(topicComments.createdAt))
      .limit(30);
    res.json(comments);
  });

  app.post("/api/topics/:topicId/comments", async (req, res) => {
    const user = await getCurrentUser(req);
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });
    if (content.length > 500) return res.status(400).json({ error: "Comment too long (max 500 chars)" });

    const [comment] = await db.insert(topicComments).values({
      id: randomUUID(),
      topicId: req.params.topicId,
      userId: user.id,
      username: user.username,
      content: content.trim(),
    }).returning();
    res.json(comment);
  });

  // ── Per-topic mini leaderboard ──
  app.get("/api/topics/:topicId/leaderboard", async (req, res) => {
    const rows = await db
      .select()
      .from(userTopicProgress)
      .where(eq(userTopicProgress.topicId, req.params.topicId))
      .orderBy(desc(userTopicProgress.completionPercentage))
      .limit(10);

    const userIds = rows.map((r) => r.userId);
    const allUsers = userIds.length > 0
      ? await db.select().from(users).where(inArray(users.id, userIds))
      : [];
    const userMap = new Map(allUsers.map((u) => [u.id, u]));

    const entries = rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      username: userMap.get(r.userId)?.username || "Learner",
      completionPercentage: r.completionPercentage,
      expertiseLevel: r.expertiseLevel,
      streak: userMap.get(r.userId)?.streak || 0,
    }));

    // Also return count of distinct learners for social proof
    const learnerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(userTopicProgress)
      .where(eq(userTopicProgress.topicId, req.params.topicId));

    res.json({ entries, totalLearners: Number(learnerCount[0]?.count || 0) });
  });

  // ── Social proof: comment count per topic (batch) ──
  app.get("/api/topics/comment-counts", async (req, res) => {
    const counts = await db
      .select({
        topicId: topicComments.topicId,
        count: sql<number>`count(*)`,
      })
      .from(topicComments)
      .groupBy(topicComments.topicId);
    const result: Record<string, number> = {};
    for (const row of counts) result[row.topicId] = Number(row.count);
    res.json(result);
  });

  // ── Vibe Learner Nudge ──
  app.post("/api/vibe-nudge", async (req, res) => {
    const { conceptId, secondsSpent } = req.body;
    if (!conceptId) return res.status(400).json({ error: "conceptId required" });
    const user = await getCurrentUser(req);

    const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId)).limit(1);
    if (!concept) return res.status(404).json({ error: "Concept not found" });

    const accuracyPct = user.totalAnswered > 0
      ? Math.round((user.totalCorrect / user.totalAnswered) * 100)
      : 50;

    try {
      const { generateVibeNudge } = await import("./ai-service");
      const nudge = await generateVibeNudge(
        concept.title,
        concept.keyTakeaway,
        secondsSpent || 30,
        accuracyPct
      );
      res.json(nudge);
    } catch (err: any) {
      res.json({ message: "Keep going — you're making great progress!", type: "encouragement" });
    }
  });

  // ── AI Tutor: answer a question grounded in the current concept ──
  app.post("/api/ask-tutor", async (req, res) => {
    const { conceptId, question } = req.body;
    if (!conceptId || !question) {
      return res.status(400).json({ error: "conceptId and question are required" });
    }
    const [concept] = await db.select().from(concepts).where(eq(concepts.id, conceptId)).limit(1);
    if (!concept) {
      return res.status(404).json({ error: "Concept not found" });
    }
    try {
      const { answerConceptQuestion } = await import("./ai-service");
      const answer = await answerConceptQuestion(concept.title, concept.content, question);
      res.json({ answer });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "AI tutor unavailable" });
    }
  });

  // ── Learning Plan ──
  app.get("/api/learning-plan", async (req, res) => {
    const user = await getCurrentUser(req);
    const [plan] = await db.select().from(learningPlans).where(eq(learningPlans.userId, user.id)).limit(1);
    res.json(plan || null);
  });

  app.post("/api/learning-plan", async (req, res) => {
    const user = await getCurrentUser(req);
    const { name, topicIds, weeklyGoalMinutes, targetDate, notes } = req.body;

    const [existing] = await db.select().from(learningPlans).where(eq(learningPlans.userId, user.id)).limit(1);
    if (existing) {
      await db.update(learningPlans).set({
        name: name || existing.name,
        topicIds: topicIds ?? existing.topicIds,
        weeklyGoalMinutes: weeklyGoalMinutes ?? existing.weeklyGoalMinutes,
        targetDate: targetDate ? new Date(targetDate) : existing.targetDate,
        notes: notes ?? existing.notes,
        updatedAt: new Date(),
      }).where(eq(learningPlans.userId, user.id));
      const [updated] = await db.select().from(learningPlans).where(eq(learningPlans.userId, user.id)).limit(1);
      return res.json(updated);
    }

    const [created] = await db.insert(learningPlans).values({
      id: randomUUID(),
      userId: user.id,
      name: name || "My Learning Plan",
      topicIds: topicIds || [],
      weeklyGoalMinutes: weeklyGoalMinutes || 60,
      targetDate: targetDate ? new Date(targetDate) : null,
      notes: notes || null,
    }).returning();
    res.json(created);
  });

  registerAdminRoutes(app);

  return httpServer;
}
