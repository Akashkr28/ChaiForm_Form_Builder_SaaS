import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import type { FormField, FormResponse, Theme } from "@repo/forms";
import { usersTable } from "./user";

export const formStatusEnum = pgEnum("form_status", ["draft", "published", "archived"]);
export const formVisibilityEnum = pgEnum("form_visibility", ["public", "unlisted"]);

export const formsTable = pgTable(
  "forms",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    description: text("description").notNull(),
    slug: varchar("slug", { length: 80 }).notNull().unique(),
    status: formStatusEnum("status").notNull().default("draft"),
    visibility: formVisibilityEnum("visibility").notNull().default("unlisted"),
    passwordHash: text("password_hash"),
    fields: jsonb("fields").$type<FormField[]>().notNull(),
    theme: jsonb("theme").$type<Theme>().notNull(),
    responseLimit: integer("response_limit"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
  },
  (table) => ({
    slugIdx: index("forms_slug_idx").on(table.slug),
    ownerIdx: index("forms_owner_idx").on(table.ownerId),
    publicIdx: index("forms_public_idx").on(table.status, table.visibility),
  }),
);

export const formResponsesTable = pgTable(
  "form_responses",
  {
    id: varchar("id", { length: 80 }).primaryKey(),
    formId: varchar("form_id", { length: 80 })
      .notNull()
      .references(() => formsTable.id, { onDelete: "cascade" }),
    respondentEmail: varchar("respondent_email", { length: 255 }),
    values: jsonb("values").$type<FormResponse["values"]>().notNull(),
    ipHash: varchar("ip_hash", { length: 128 }),
    userAgent: text("user_agent"),
    isSpam: boolean("is_spam").notNull().default(false),
    submittedAt: timestamp("submitted_at").defaultNow(),
  },
  (table) => ({
    formIdx: index("form_responses_form_idx").on(table.formId),
    submittedIdx: index("form_responses_submitted_idx").on(table.submittedAt),
  }),
);

export const emailEventsTable = pgTable("email_events", {
  id: varchar("id", { length: 80 }).primaryKey(),
  formId: varchar("form_id", { length: 80 }).references(() => formsTable.id, { onDelete: "set null" }),
  responseId: varchar("response_id", { length: 80 }).references(() => formResponsesTable.id, { onDelete: "set null" }),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("queued"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rateLimitsTable = pgTable(
  "rate_limits",
  {
    key: varchar("key", { length: 180 }).primaryKey(),
    count: integer("count").notNull().default(1),
    resetAt: timestamp("reset_at").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    resetAtIdx: index("rate_limits_reset_at_idx").on(table.resetAt),
  }),
);

export const formsRelations = relations(formsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [formsTable.ownerId],
    references: [usersTable.id],
  }),
  responses: many(formResponsesTable),
}));

export const formResponsesRelations = relations(formResponsesTable, ({ one }) => ({
  form: one(formsTable, {
    fields: [formResponsesTable.formId],
    references: [formsTable.id],
  }),
}));

export type SelectForm = typeof formsTable.$inferSelect;
export type InsertForm = typeof formsTable.$inferInsert;
export type SelectFormResponse = typeof formResponsesTable.$inferSelect;
export type InsertFormResponse = typeof formResponsesTable.$inferInsert;
