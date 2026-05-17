import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  real,
  jsonb,
  pgEnum,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["candidate", "company"]);
export const docTypeEnum = pgEnum("doc_type", [
  "resume",
  "linkedin",
  "sop",
  "culture",
  "jd",
  "employee_cv",
  "other",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  onboardingComplete: boolean("onboarding_complete").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Candidates ───────────────────────────────────────────────────────────────

export const candidates = pgTable("candidates", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  goals: jsonb("goals").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const candidateDocuments = pgTable("candidate_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  docType: docTypeEnum("doc_type").notNull().default("other"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const candidateChunks = pgTable(
  "candidate_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    documentId: uuid("document_id").references(() => candidateDocuments.id, {
      onDelete: "cascade",
    }),
    content: text("content").notNull(),
    // stored as text, cast to vector in queries
    embedding: text("embedding").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    candidateIdx: index("candidate_chunks_candidate_idx").on(t.candidateId),
  })
);

// ─── Companies ────────────────────────────────────────────────────────────────

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  hardRequirements: jsonb("hard_requirements")
    .$type<string[]>()
    .notNull()
    .default([]),
  softRequirements: jsonb("soft_requirements")
    .$type<string[]>()
    .notNull()
    .default([]),
  compRange: jsonb("comp_range")
    .$type<{ min: number; max: number; currency: string }>()
    .default({ min: 0, max: 0, currency: "USD" }),
  location: text("location").notNull().default(""),
  remote: boolean("remote").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const companyDocuments = pgTable("company_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
  filename: text("filename").notNull(),
  content: text("content").notNull(),
  docType: docTypeEnum("doc_type").notNull().default("other"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobChunks = pgTable(
  "job_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    embedding: text("embedding").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    jobIdx: index("job_chunks_job_idx").on(t.jobId),
  })
);

// ─── Matches ──────────────────────────────────────────────────────────────────

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    score: real("score").notNull().default(0),
    reasoning: text("reasoning").notNull().default(""),
    matchDetails: jsonb("match_details")
      .$type<{
        strengths: string[];
        gaps: string[];
        cultureFit: string;
        recommendation: string;
      }>()
      .default({
        strengths: [],
        gaps: [],
        cultureFit: "",
        recommendation: "",
      }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    candidateJobIdx: index("matches_candidate_job_idx").on(
      t.candidateId,
      t.jobId
    ),
  })
);

// ─── Relations ────────────────────────────────────────────────────────────────

import { relations } from "drizzle-orm";

export const candidatesRelations = relations(candidates, ({ many }) => ({
  chunks: many(candidateChunks),
  documents: many(candidateDocuments),
}));

export const candidateChunksRelations = relations(candidateChunks, ({ one }) => ({
  candidate: one(candidates, {
    fields: [candidateChunks.candidateId],
    references: [candidates.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ many }) => ({
  chunks: many(jobChunks),
  documents: many(companyDocuments),
}));

export const jobChunksRelations = relations(jobChunks, ({ one }) => ({
  job: one(jobs, {
    fields: [jobChunks.jobId],
    references: [jobs.id],
  }),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  jobs: many(jobs),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type CandidateDocument = typeof candidateDocuments.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type CompanyDocument = typeof companyDocuments.$inferSelect;
export type Match = typeof matches.$inferSelect;
