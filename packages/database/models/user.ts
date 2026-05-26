import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  text,
} from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  fullName: varchar("full_name", { length: 80 }).notNull(),
  firstName: varchar("first_name", { length: 80 }),
  lastName: varchar("last_name", { length: 80 }),
  contactNo: varchar("contact_no", { length: 32 }),
  occupation: varchar("occupation", { length: 40 }),
  organizationName: varchar("organization_name", { length: 120 }),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),

  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
  passwordHash: text("password_hash"),
  authProvider: varchar("auth_provider", { length: 40 }).notNull().default("credentials"),
  authProviderId: varchar("auth_provider_id", { length: 255 }),
  subscriptionPlan: varchar("subscription_plan", { length: 40 }).notNull().default("starter"),
  subscriptionStatus: varchar("subscription_status", { length: 40 }).notNull().default("active"),

  profileImageUrl: text("profile_image_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

export const sessionsTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SelectUser = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type SelectSession = typeof sessionsTable.$inferSelect;
