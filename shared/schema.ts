import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Telegram users.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), // Keep UUID format
  telegramId: varchar("telegram_id").unique(), // telegram user ID
  username: varchar("username"), // telegram username (@username)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  languageCode: varchar("language_code").default("en"),
  isPremium: boolean("is_premium").default(false), // telegram premium status
  photoUrl: varchar("photo_url"),
  subscriptionStatus: varchar("subscription_status").default("free"),
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  dailyQueryCount: integer("daily_query_count").default(0).notNull(),
  lastQueryReset: timestamp("last_query_reset").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Search queries table
export const searchQueries = pgTable("search_queries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  queryType: varchar("query_type").notNull(), // domain, ip, email, hash
  queryTerm: text("query_term").notNull(),
  results: jsonb("results"),
  resultCount: integer("result_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertSearchQuerySchema = createInsertSchema(searchQueries).pick({
  queryType: true,
  queryTerm: true,
  results: true,
  resultCount: true,
});

export type InsertSearchQuery = z.infer<typeof insertSearchQuerySchema>;
export type SearchQuery = typeof searchQueries.$inferSelect;
