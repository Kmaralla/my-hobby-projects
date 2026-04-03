import { db } from "./db";
import { 
  users, modules, lessons, questions, userProgress,
  concepts, conceptQuestions, topics,
  type User, type Module, type Lesson, type Question, type UserProgress,
  type InsertUser
} from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { IStorage } from "./storage";

/**
 * DatabaseStorage - PostgreSQL implementation of IStorage
 * Replaces MemStorage for persistent data storage
 */
export class DatabaseStorage implements IStorage {
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await db.insert(users).values({
      id,
      username: insertUser.username,
      credits: insertUser.credits ?? 0,
      streak: insertUser.streak ?? 0,
      totalCorrect: insertUser.totalCorrect ?? 0,
      totalAnswered: insertUser.totalAnswered ?? 0,
      currentLevel: insertUser.currentLevel ?? "beginner",
      startDate: new Date(), // Set start date when user is created
    }).returning();
    return user;
  }

  async updateUserCredits(id: string, creditsToAdd: number): Promise<void> {
    await db.update(users)
      .set({ credits: sql`${users.credits} + ${creditsToAdd}` })
      .where(eq(users.id, id));
  }

  async updateUserStats(id: string, correct: boolean): Promise<void> {
    await db.update(users)
      .set({
        totalAnswered: sql`${users.totalAnswered} + 1`,
        totalCorrect: correct ? sql`${users.totalCorrect} + 1` : users.totalCorrect,
      })
      .where(eq(users.id, id));
  }

  async updateUserLevel(id: string, level: string): Promise<void> {
    await db.update(users)
      .set({ currentLevel: level })
      .where(eq(users.id, id));
  }

  async updateUserStreak(id: string, streak: number): Promise<void> {
    await db.update(users)
      .set({ streak })
      .where(eq(users.id, id));
  }

  // Module operations
  async getModules(): Promise<Module[]> {
    return await db.select().from(modules).orderBy(modules.order);
  }

  async getModule(id: string): Promise<Module | undefined> {
    const result = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
    return result[0];
  }

  // Lesson operations
  async getLessons(moduleId: string): Promise<Lesson[]> {
    return await db.select().from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .orderBy(lessons.order);
  }

  async getLesson(id: string): Promise<Lesson | undefined> {
    const result = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
    return result[0];
  }

  // Question operations
  async getQuestions(lessonId: string): Promise<Question[]> {
    return await db.select().from(questions).where(eq(questions.lessonId, lessonId));
  }

  async getQuestion(id: string): Promise<Question | undefined> {
    const result = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
    return result[0];
  }

  // Progress operations
  async getUserProgress(lessonId: string): Promise<UserProgress | undefined> {
    const result = await db.select().from(userProgress)
      .where(eq(userProgress.lessonId, lessonId))
      .limit(1);
    return result[0];
  }

  async completeLesson(
    lessonId: string, 
    moduleId: string, 
    correctAnswers: number, 
    totalQuestions: number
  ): Promise<void> {
    const id = randomUUID();
    await db.insert(userProgress).values({
      id,
      moduleId,
      lessonId,
      completed: true,
      correctAnswers,
      totalQuestions,
    }).onConflictDoUpdate({
      target: userProgress.lessonId,
      set: {
        completed: true,
        correctAnswers,
        totalQuestions,
      },
    });
  }

  async getCompletedLessonIds(): Promise<string[]> {
    const result = await db.select({ lessonId: userProgress.lessonId })
      .from(userProgress)
      .where(eq(userProgress.completed, true));
    return result.map(r => r.lessonId);
  }

  // Helper method to get or create default user (for backward compatibility)
  async getDefaultUser(): Promise<User> {
    // Try to get a user, or create default one
    const allUsers = await db.select().from(users).limit(1);
    if (allUsers.length > 0) {
      return allUsers[0];
    }
    
    // Create default user
    return await this.createUser({
      username: "Learner",
      credits: 0,
      streak: 1,
      totalCorrect: 0,
      totalAnswered: 0,
      currentLevel: "beginner",
    });
  }

  // Helper method to update username
  async updateUsername(id: string, username: string): Promise<void> {
    await db.update(users)
      .set({ username })
      .where(eq(users.id, id));
  }
}
