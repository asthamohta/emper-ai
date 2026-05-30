/**
 * Persistence layer for the Python-backed match pipeline.
 *
 * NOTE: We dual-write the persona to candidate_personas (canonical) and
 * to candidates.goals (derived, for Kira backward compat). The goals
 * write is temporary — Kira will migrate to read from persona claims
 * in a future build. Do not add new readers of goals.
 */

import { and, count, desc, eq, gt, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  candidateConversations,
  candidateDocuments,
  candidatePersonas,
  candidateVerdicts,
  candidates,
  companies,
  jobs,
} from "@/db/schema";
import {
  AGENTS_PIPELINE_VERSION,
  type CandidatePersona,
  type Claim,
  type Conversation,
  type Verdict,
} from "@/lib/agents-client";

// ───────────────────────────────────────────────────────────────────────────
// Convenience-count math
// ───────────────────────────────────────────────────────────────────────────

function computePersonaCounts(p: CandidatePersona) {
  return {
    claimCount: p.claims.length,
    corroboratedClaimCount: p.claims.filter((c) => c.corroboration_count >= 2).length,
    discrepancyCount: p.claims.filter((c) => c.discrepancy_flag != null).length,
    singleSourceCount: p.claims.filter((c) => c.corroboration_count === 1).length,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Dual-write: persona → goals (derived)
// ───────────────────────────────────────────────────────────────────────────

/**
 * NOTE: Behavioral fields (working_style, communication_style,
 * career_trajectory, values, intellectual_interests) populate ONLY
 * when persona has claims with controlled-vocabulary tags from the
 * AI_CHAT_HISTORY_EXTRACTION_PROMPT. Scraper-only candidates leave
 * these empty by design — Kira fills them via gap-asking.
 *
 * If you find yourself wanting to claim-text-mine scraper claims to
 * populate these, STOP. Add the tag in the Python profile builder
 * instead.
 */
export function flattenPersonaToGoals(
  persona: CandidatePersona,
  existingGoals: Record<string, unknown> = {}
): Record<string, unknown> {
  const claimsWithTag = (tag: string): Claim[] =>
    persona.claims.filter((c) => c.tags.includes(tag));
  const join = (cs: Claim[]) => cs.map((c) => c.claim_text).join("\n");

  const derived: Record<string, string> = {};

  // Always populated.
  derived.summary = persona.summary;

  // Exact-tag matches against the AI_CHAT_HISTORY_EXTRACTION_PROMPT
  // controlled vocabulary. Scraper-derived claims won't usually match —
  // that's the point.
  const ws = claimsWithTag("working_style");
  if (ws.length > 0) derived.working_style = join(ws);

  const comm = claimsWithTag("communication");
  if (comm.length > 0) derived.communication_style = join(comm);

  // professional_goals fans out into BOTH career_trajectory and values,
  // because Kira reads both keys and a single goal-set covers both.
  const pg = claimsWithTag("professional_goals");
  if (pg.length > 0) {
    derived.career_trajectory = join(pg);
    derived.values = join(pg);
  }

  const ti = claimsWithTag("technical_interests");
  if (ti.length > 0) derived.intellectual_interests = join(ti);

  // experience_level, industries, skills, projects: NOT derived.
  // Preserve whatever was written by the legacy `extractCandidateContext`
  // path or by Kira chat. Kira will keep asking about these as gaps.

  return {
    ...existingGoals,
    ...derived,
    _personaSync: true,
    _personaBuiltAt: persona.built_at,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Persona persistence
// ───────────────────────────────────────────────────────────────────────────

/**
 * Upsert a persona. Replaces the candidate's existing persona (one persona
 * per candidate). Also dual-writes a derived view to `candidates.goals` so
 * Kira's gap-asking logic continues to work.
 *
 * Wrapped in a transaction so the two writes don't drift.
 */
export async function savePersona(
  candidateId: string,
  persona: CandidatePersona
): Promise<void> {
  // Pydantic emits ISO timestamps with `Z` suffix — Date can parse both.
  const builtAt = persona.built_at ? new Date(persona.built_at) : new Date();
  const counts = computePersonaCounts(persona);

  await db.transaction(async (tx) => {
    // 1. Upsert canonical persona.
    await tx
      .insert(candidatePersonas)
      .values({
        candidateId,
        summary: persona.summary,
        data: persona as unknown as Record<string, unknown>,
        builtAt,
        modelVersion: AGENTS_PIPELINE_VERSION,
        ...counts,
      })
      .onConflictDoUpdate({
        target: candidatePersonas.candidateId,
        set: {
          summary: persona.summary,
          data: persona as unknown as Record<string, unknown>,
          builtAt,
          modelVersion: AGENTS_PIPELINE_VERSION,
          ...counts,
        },
      });

    // 2. Dual-write derived goals.
    const existing = await tx.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
      columns: { goals: true },
    });
    const existingGoals = (existing?.goals as Record<string, unknown>) ?? {};
    const newGoals = flattenPersonaToGoals(persona, existingGoals);
    await tx.update(candidates).set({ goals: newGoals }).where(eq(candidates.id, candidateId));
  });
}

/**
 * Read the canonical persona JSON. Returns null if no persona exists yet.
 */
export async function getPersona(candidateId: string): Promise<CandidatePersona | null> {
  const row = await db.query.candidatePersonas.findFirst({
    where: eq(candidatePersonas.candidateId, candidateId),
  });
  if (!row) return null;
  return row.data as unknown as CandidatePersona;
}

/**
 * Read the persona plus a freshness flag indicating whether new candidate
 * documents have arrived since the persona was built. Used by the SelfPage
 * to show a "your profile is being refreshed…" banner.
 *
 * Definition of stale: a candidate document exists with createdAt > persona.builtAt.
 *
 * Edge cases:
 *   - No persona, no docs       → isStale = false
 *   - No persona, ≥1 doc        → isStale = true (rebuild pending)
 *   - Persona, no newer doc     → isStale = false
 *   - Persona, ≥1 newer doc     → isStale = true
 *
 * NOTE: We deliberately do NOT consider `candidates.updated_at` (which can
 * change when Kira touches goals via chat). The persona is derived from
 * documents, not from chat updates.
 */
export async function getPersonaWithFreshness(candidateId: string): Promise<{
  persona: CandidatePersona | null;
  builtAt: Date | null;
  isStale: boolean;
}> {
  const personaRow = await db.query.candidatePersonas.findFirst({
    where: eq(candidatePersonas.candidateId, candidateId),
  });

  if (!personaRow) {
    const [{ value: docCount }] = await db
      .select({ value: count() })
      .from(candidateDocuments)
      .where(eq(candidateDocuments.candidateId, candidateId));
    return { persona: null, builtAt: null, isStale: docCount > 0 };
  }

  const [{ value: newerCount }] = await db
    .select({ value: count() })
    .from(candidateDocuments)
    .where(
      and(
        eq(candidateDocuments.candidateId, candidateId),
        gt(candidateDocuments.createdAt, personaRow.builtAt)
      )
    );

  return {
    persona: personaRow.data as unknown as CandidatePersona,
    builtAt: personaRow.builtAt,
    isStale: newerCount > 0,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Conversation + verdict persistence
// ───────────────────────────────────────────────────────────────────────────

/**
 * Atomically persist a conversation and its verdict from Python's match
 * pipeline. roleId must reference a real jobs.id (real FK, restrict on delete).
 *
 * Idempotent on (agent_conversation_id): re-saving the same Python
 * conversation overwrites. The conversation's verdict has a unique FK on
 * conversation_id, so re-runs also overwrite the verdict.
 */
export async function saveConversationAndVerdict(args: {
  candidateId: string;
  roleId: string;
  conversation: Conversation;
  verdict: Verdict;
}): Promise<{ conversationDbId: string; verdictDbId: string }> {
  const { candidateId, roleId, conversation, verdict } = args;

  return db.transaction(async (tx) => {
    // 1. Upsert conversation by agent_conversation_id.
    const [convRow] = await tx
      .insert(candidateConversations)
      .values({
        agentConversationId: conversation.conversation_id,
        candidateId,
        roleId,
        transcript: conversation.transcript as unknown as Record<string, unknown>,
        terminationReason: conversation.termination_reason,
        walkedAwayBy: conversation.walked_away_by,
        walkReason: conversation.walk_reason,
        turnCount: conversation.turn_count,
        // Drizzle's numeric column accepts string (preserves precision).
        costUsd: conversation.cost_usd.toFixed(4),
        startedAt: new Date(conversation.started_at),
        endedAt: new Date(conversation.ended_at),
      })
      .onConflictDoUpdate({
        target: candidateConversations.agentConversationId,
        set: {
          transcript: conversation.transcript as unknown as Record<string, unknown>,
          terminationReason: conversation.termination_reason,
          walkedAwayBy: conversation.walked_away_by,
          walkReason: conversation.walk_reason,
          turnCount: conversation.turn_count,
          costUsd: conversation.cost_usd.toFixed(4),
          endedAt: new Date(conversation.ended_at),
        },
      })
      .returning({ id: candidateConversations.id });

    // 2. Upsert verdict by conversation_id (unique).
    const [vRow] = await tx
      .insert(candidateVerdicts)
      .values({
        conversationId: convRow.id,
        candidateId,
        roleId,
        matchVerdict: verdict.match_verdict,
        confidence: verdict.confidence.toFixed(3),
        reasoning: verdict.reasoning,
        evidenceFor: verdict.evidence_for_match,
        evidenceAgainst: verdict.evidence_against_match,
        unresolvedConcerns: verdict.unresolved_concerns,
        surfaceToHuman: verdict.surface_to_human,
        biasFlags: verdict.bias_flags,
        modelVersion: AGENTS_PIPELINE_VERSION,
        judgedAt: new Date(verdict.judged_at),
      })
      .onConflictDoUpdate({
        target: candidateVerdicts.conversationId,
        set: {
          matchVerdict: verdict.match_verdict,
          confidence: verdict.confidence.toFixed(3),
          reasoning: verdict.reasoning,
          evidenceFor: verdict.evidence_for_match,
          evidenceAgainst: verdict.evidence_against_match,
          unresolvedConcerns: verdict.unresolved_concerns,
          surfaceToHuman: verdict.surface_to_human,
          biasFlags: verdict.bias_flags,
          modelVersion: AGENTS_PIPELINE_VERSION,
          judgedAt: new Date(verdict.judged_at),
        },
      })
      .returning({ id: candidateVerdicts.id });

    return { conversationDbId: convRow.id, verdictDbId: vRow.id };
  });
}

/**
 * Verdicts for a candidate joined with the conversation, job, and company
 * tables — enough to drive the Intros page UI in Part 6.
 *
 * onlySurfaceable defaults to true so the Intros page only sees recommended
 * matches. Pass false for an internal/debug view.
 */
export async function getVerdictsForCandidate(
  candidateId: string,
  options?: { onlySurfaceable?: boolean; limit?: number }
): Promise<
  Array<{
    verdict: typeof candidateVerdicts.$inferSelect;
    conversation: typeof candidateConversations.$inferSelect;
    job: typeof jobs.$inferSelect;
    company: typeof companies.$inferSelect;
  }>
> {
  const onlySurfaceable = options?.onlySurfaceable ?? true;
  const limit = options?.limit ?? 50;

  const where = onlySurfaceable
    ? and(
        eq(candidateVerdicts.candidateId, candidateId),
        eq(candidateVerdicts.surfaceToHuman, true)
      )
    : eq(candidateVerdicts.candidateId, candidateId);

  const rows = await db
    .select({
      verdict: candidateVerdicts,
      conversation: candidateConversations,
      job: jobs,
      company: companies,
    })
    .from(candidateVerdicts)
    .innerJoin(
      candidateConversations,
      eq(candidateConversations.id, candidateVerdicts.conversationId)
    )
    .innerJoin(jobs, eq(jobs.id, candidateVerdicts.roleId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(where)
    .orderBy(desc(candidateVerdicts.confidence), desc(candidateVerdicts.judgedAt))
    .limit(limit);

  return rows;
}

// ───────────────────────────────────────────────────────────────────────────
// Lookups used by runMatchByIds (the agents-client.ts convenience wrapper)
// ───────────────────────────────────────────────────────────────────────────

/**
 * For agents-client's runMatchByIds. Pulls a stored CandidatePersona that
 * can be passed straight to the stateless Python /match endpoint.
 */
export async function fetchCandidatePersonaForMatch(
  candidateId: string
): Promise<CandidatePersona | null> {
  return getPersona(candidateId);
}

/**
 * Sibling helper for role personas. Roles are persisted via a separate
 * code path that we'll wire up in Part 4b / Part 6 (the role-builder side
 * needs its own from-payload endpoint + a small role_personas table OR
 * the role-builder result lives entirely on the jobs row). For now, this
 * function reads from a `rolePersona` field we'll add later or returns
 * null. Stubbed until Part 6 decides the role-persona storage.
 */
export async function fetchRolePersonaForMatch(
  _roleId: string
): Promise<null> {
  // INTENTIONAL: returns null until Part 6 wires role persona storage.
  // agents-client.ts:runMatchByIds will throw a clean error if called now,
  // which is correct — runMatch isn't a public-facing flow yet.
  return null;
}

// Re-export the version constant for callers that want to record what
// pipeline produced a given row.
export { AGENTS_PIPELINE_VERSION };
