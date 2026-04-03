import { pgTable, text, varchar, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: text("username").notNull().unique(),
  credits: integer("credits").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  totalAnswered: integer("total_answered").notNull().default(0),
  currentLevel: text("current_level").notNull().default("beginner"),
  startDate: timestamp("start_date").defaultNow(), // When user started learning (for day-based unlocking)
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentSources = pgTable("content_sources", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  url: text("url"),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topics = pgTable("topics", {
  id: varchar("id", { length: 36 }).primaryKey(),
  sourceId: varchar("source_id", { length: 36 }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  unlockDay: integer("unlock_day").notNull().default(1), // Day when topic unlocks (1 = Day 1, 2 = Day 2, etc.)
});

export const concepts = pgTable("concepts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  topicId: varchar("topic_id", { length: 36 }).notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  keyTakeaway: text("key_takeaway").notNull(),
  difficulty: text("difficulty").notNull().default("beginner"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const conceptQuestions = pgTable("concept_questions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  conceptId: varchar("concept_id", { length: 36 }).notNull(),
  scenario: text("scenario"),
  question: text("question").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: text("difficulty").notNull().default("beginner"),
  creditsReward: integer("credits_reward").notNull().default(10),
  isActive: boolean("is_active").notNull().default(true),
});

export const modules = pgTable("modules", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  order: integer("order").notNull(),
  isLocked: boolean("is_locked").notNull().default(true),
});

export const lessons = pgTable("lessons", {
  id: varchar("id", { length: 36 }).primaryKey(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  title: text("title").notNull(),
  theory: text("theory").notNull(),
  order: integer("order").notNull(),
  difficulty: text("difficulty").notNull().default("beginner"),
});

export const questions = pgTable("questions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  lessonId: varchar("lesson_id", { length: 36 }).notNull(),
  scenario: text("scenario").notNull(),
  question: text("question").notNull(),
  options: jsonb("options").notNull().$type<string[]>(),
  correctIndex: integer("correct_index").notNull(),
  explanation: text("explanation").notNull(),
  difficulty: text("difficulty").notNull().default("beginner"),
  creditsReward: integer("credits_reward").notNull().default(10),
});

export const userProgress = pgTable("user_progress", {
  id: varchar("id", { length: 36 }).primaryKey(),
  moduleId: varchar("module_id", { length: 36 }).notNull(),
  lessonId: varchar("lesson_id", { length: 36 }).notNull(),
  completed: boolean("completed").notNull().default(false),
  correctAnswers: integer("correct_answers").notNull().default(0),
  totalQuestions: integer("total_questions").notNull().default(0),
});

export const userTopicProgress = pgTable("user_topic_progress", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  topicId: varchar("topic_id", { length: 36 }).notNull(),
  expertiseLevel: text("expertise_level").notNull().default("beginner"),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  totalLessons: integer("total_lessons").notNull().default(0),
  completedLessons: integer("completed_lessons").notNull().default(0),
  totalCorrect: integer("total_correct").notNull().default(0),
  totalAnswered: integer("total_answered").notNull().default(0),
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userDailyStats = pgTable("user_daily_stats", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  dateKey: text("date_key").notNull(),
  questionsAnswered: integer("questions_answered").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  creditsEarned: integer("credits_earned").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const topicComments = pgTable("topic_comments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  topicId: varchar("topic_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  username: text("username").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const learningPlans = pgTable("learning_plans", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  name: text("name").notNull().default("My Learning Plan"),
  topicIds: jsonb("topic_ids").notNull().$type<string[]>().default([]),
  weeklyGoalMinutes: integer("weekly_goal_minutes").notNull().default(60),
  targetDate: timestamp("target_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export const insertContentSourceSchema = createInsertSchema(contentSources).omit({ id: true, createdAt: true });
export const insertTopicSchema = createInsertSchema(topics).omit({ id: true });
export const insertConceptSchema = createInsertSchema(concepts).omit({ id: true });
export const insertConceptQuestionSchema = createInsertSchema(conceptQuestions).omit({ id: true });
export const insertModuleSchema = createInsertSchema(modules).omit({ id: true });
export const insertLessonSchema = createInsertSchema(lessons).omit({ id: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true });
export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ id: true });
export const insertUserDailyStatsSchema = createInsertSchema(userDailyStats).omit({ id: true, createdAt: true });
export const insertLearningPlanSchema = createInsertSchema(learningPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTopicCommentSchema = createInsertSchema(topicComments).omit({ id: true, createdAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type InsertContentSource = z.infer<typeof insertContentSourceSchema>;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type InsertConcept = z.infer<typeof insertConceptSchema>;
export type InsertConceptQuestion = z.infer<typeof insertConceptQuestionSchema>;
export type InsertUserDailyStats = z.infer<typeof insertUserDailyStatsSchema>;

export type User = typeof users.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type ContentSource = typeof contentSources.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Concept = typeof concepts.$inferSelect;
export type ConceptQuestion = typeof conceptQuestions.$inferSelect;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type UserDailyStats = typeof userDailyStats.$inferSelect;
export type TopicComment = typeof topicComments.$inferSelect;
export type LearningPlan = typeof learningPlans.$inferSelect;
export type InsertLearningPlan = z.infer<typeof insertLearningPlanSchema>;

export type QuestionOption = {
  text: string;
  isCorrect: boolean;
};

export type LessonWithQuestions = Lesson & {
  questions: Question[];
};

export type ModuleWithLessons = Module & {
  lessons: Lesson[];
  progress?: {
    completed: number;
    total: number;
  };
};
