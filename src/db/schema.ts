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
  "github",
  "website",
  "portfolio",
  "paper",
  "ai_chat_history",                                  // NEW: pasted-in AI behavioral profile (Part 3)
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
  // Was Record<string, string> — widened to unknown because extractCandidateContext
  // already writes nested arrays (projects[]) here, and Part 2's persona-store
  // dual-write adds _personaSync (boolean) and _personaBuiltAt (string).
  goals: jsonb("goals").$type<Record<string, unknown>>().default({}),
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

// ─── Persona / Match Pipeline (Python-backed) ─────────────────────────────────
// New as of 2026-05-27. All matching now flows through izhaar-agents/ (Python
// FastAPI service). Next.js is proxy + persistence + UI.
// The older `matches` table above is DEPRECATED — see src/lib/matching.ts.

import { numeric } from "drizzle-orm/pg-core";

export const candidatePersonas = pgTable(
  "candidate_personas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" })
      .unique(),                                                       // one persona per candidate (latest overwrites)
    summary: text("summary"),                                          // mirror of data.summary for fast queries
    data: jsonb("data").notNull(),                                     // full CandidatePersona JSON from Python
    claimCount: integer("claim_count").notNull().default(0),
    corroboratedClaimCount: integer("corroborated_claim_count").notNull().default(0),
    discrepancyCount: integer("discrepancy_count").notNull().default(0),
    singleSourceCount: integer("single_source_count").notNull().default(0),
    builtAt: timestamp("built_at").notNull().defaultNow(),             // set from persona.built_at, parsed
    modelVersion: text("model_version").notNull(),                     // e.g. "sonnet-4-6/v1_multi_source_2026_05"
  },
  (t) => ({
    builtAtIdx: index("personas_built_at_idx").on(t.builtAt),          // freshness query, future cross-candidate scans
  })
);

export const candidateConversations = pgTable(
  "candidate_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentConversationId: text("agent_conversation_id").notNull().unique(),  // Python's conv_xxxx — kept for cross-system debugging
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),            // historical evidence; can't delete a job with verdicts
    transcript: jsonb("transcript").notNull(),                         // Turn[]
    terminationReason: text("termination_reason"),                     // Python emits a Literal; we keep text, validate on write
    walkedAwayBy: text("walked_away_by"),                              // "candidate" | "role" | null; same — text, not enum
    walkReason: text("walk_reason"),
    turnCount: integer("turn_count"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }),
    startedAt: timestamp("started_at"),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pairIdx: index("conv_pair_idx").on(t.candidateId, t.roleId),       // "did we already match these two?"
  })
);

export const candidateVerdicts = pgTable(
  "candidate_verdicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => candidateConversations.id, { onDelete: "cascade" })
      .unique(),                                                       // one verdict per conversation
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "restrict" }),
    matchVerdict: text("match_verdict").notNull(),                     // strong | good | marginal | no_match
    confidence: numeric("confidence", { precision: 4, scale: 3 }),     // 0.000 – 1.000
    reasoning: text("reasoning"),
    evidenceFor: jsonb("evidence_for").$type<string[]>().default([]),
    evidenceAgainst: jsonb("evidence_against").$type<string[]>().default([]),
    unresolvedConcerns: jsonb("unresolved_concerns").$type<string[]>().default([]),
    surfaceToHuman: boolean("surface_to_human").notNull().default(false),
    biasFlags: jsonb("bias_flags").$type<string[]>().default([]),
    modelVersion: text("model_version").notNull(),
    judgedAt: timestamp("judged_at").notNull().defaultNow(),
  },
  (t) => ({
    // FUTURE: When verdict volume grows, swap to partial index:
    //   index("...").on(candidateId, confidence).where(sql`surface_to_human = true`)
    // This covers WHERE + ORDER BY in one index scan. Skipping now since
    // demo has <50 verdicts total.
    surfaceIdx: index("verdicts_surface_idx").on(t.candidateId, t.surfaceToHuman),
    // Postgres b-tree supports reverse scan, so plain (col, col) covers both ASC and DESC.
    candidateJudgedIdx: index("verdicts_candidate_judged_idx").on(t.candidateId, t.judgedAt),
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
export type CandidatePersonaRow = typeof candidatePersonas.$inferSelect;
export type CandidateConversationRow = typeof candidateConversations.$inferSelect;
export type CandidateVerdictRow = typeof candidateVerdicts.$inferSelect;
