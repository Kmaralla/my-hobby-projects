import { db } from "./db";
import { topics } from "@shared/schema";
import { eq, lte } from "drizzle-orm";
import type { User, Topic } from "@shared/schema";

/**
 * Calculate days since user started
 */
export function getDaysSinceStart(user: User): number {
  if (!user.startDate) {
    return 1; // Default to day 1 if no start date
  }
  const start = new Date(user.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays); // At least day 1
}

/**
 * Get all topics with unlock status for a user
 */
export async function getTopicsWithUnlockStatus(user: User): Promise<Array<Topic & { isLocked: boolean; unlocksOnDay: number }>> {
  const allTopics = await db.select().from(topics)
    .where(eq(topics.isActive, true))
    .orderBy(topics.order);
  
  const daysSinceStart = getDaysSinceStart(user);
  
  return allTopics.map(topic => ({
    ...topic,
    isLocked: topic.unlockDay > daysSinceStart,
    unlocksOnDay: topic.unlockDay,
  }));
}

/**
 * Check if a topic is unlocked for a user
 */
export async function isTopicUnlocked(user: User, topicId: string): Promise<boolean> {
  const topic = await db.select().from(topics)
    .where(eq(topics.id, topicId))
    .limit(1);
  
  if (!topic[0]) return false;
  if (!topic[0].isActive) return false;
  
  const daysSinceStart = getDaysSinceStart(user);
  return topic[0].unlockDay <= daysSinceStart;
}

/**
 * Get the next unlock date for a topic (if locked)
 */
export function getTopicUnlockDate(user: User, unlockDay: number): Date | null {
  if (!user.startDate) return null;
  
  const start = new Date(user.startDate);
  const unlockDate = new Date(start);
  unlockDate.setDate(start.getDate() + (unlockDay - 1)); // unlockDay 1 = start date, unlockDay 2 = start + 1 day
  
  const daysSinceStart = getDaysSinceStart(user);
  if (unlockDay <= daysSinceStart) {
    return null; // Already unlocked
  }
  
  return unlockDate;
}
