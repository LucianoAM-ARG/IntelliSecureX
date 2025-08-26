import {
  users,
  searchQueries,
  type User,
  type UpsertUser,
  type SearchQuery,
  type InsertSearchQuery,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  upsertUserByTelegramId(telegramId: string, userData: Partial<UpsertUser>): Promise<User>;
  updateSubscriptionStatus(userId: string, status: string, expiresAt?: Date): Promise<User>;
  incrementDailyQueryCount(userId: string): Promise<User>;
  resetDailyQueryCountIfNeeded(userId: string): Promise<User>;
  
  // Search query operations
  createSearchQuery(userId: string, query: InsertSearchQuery): Promise<SearchQuery>;
  getUserSearchHistory(userId: string, limit?: number): Promise<SearchQuery[]>;
  getSearchQuery(id: string): Promise<SearchQuery | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user;
  }

  async upsertUserByTelegramId(telegramId: string, userData: Partial<UpsertUser>): Promise<User> {
    // First try to find existing user by telegram ID
    const existingUser = await this.getUserByTelegramId(telegramId);
    
    if (existingUser) {
      // Update existing user
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.telegramId, telegramId))
        .returning();
      return user;
    } else {
      // Create new user
      const [user] = await db
        .insert(users)
        .values({
          telegramId,
          ...userData,
        })
        .returning();
      return user;
    }
  }

  async updateSubscriptionStatus(userId: string, status: string, expiresAt?: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async incrementDailyQueryCount(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        dailyQueryCount: sql`${users.dailyQueryCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetDailyQueryCountIfNeeded(userId: string): Promise<User> {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const [user] = await db
      .update(users)
      .set({
        dailyQueryCount: 0,
        lastQueryReset: now,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.id, userId),
        gte(users.lastQueryReset, yesterday)
      ))
      .returning();
    
    return user || await this.getUser(userId);
  }

  async createSearchQuery(userId: string, query: InsertSearchQuery): Promise<SearchQuery> {
    const [searchQuery] = await db
      .insert(searchQueries)
      .values({
        ...query,
        userId,
      })
      .returning();
    return searchQuery;
  }

  async getUserSearchHistory(userId: string, limit: number = 10): Promise<SearchQuery[]> {
    return await db
      .select()
      .from(searchQueries)
      .where(eq(searchQueries.userId, userId))
      .orderBy(desc(searchQueries.createdAt))
      .limit(limit);
  }

  async getSearchQuery(id: string): Promise<SearchQuery | undefined> {
    const [query] = await db
      .select()
      .from(searchQueries)
      .where(eq(searchQueries.id, id));
    return query;
  }
}

export const storage = new DatabaseStorage();
