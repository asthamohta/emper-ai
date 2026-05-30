/**
 * GET /api/matches
 *
 * Returns the candidate's match list for the Intros page. Reads the new
 * candidate_verdicts table (Python pipeline) and shapes it for the existing
 * Workspace.tsx → matchesToIntros() consumer. Backward-compatible response
 * envelope: `{ matches: MatchRow[] }`.
 *
 * Each MatchRow has the legacy shape (match, job, company) so existing UI
 * code keeps working. `match.score` is mapped from the verdict's confidence,
 * `match.reasoning` from verdict.reasoning, and `match.matchDetails` is
 * synthesized from evidence_for_match + evidence_against_match.
 *
 * The TS-side `matches` table is no longer queried for candidates. Companies
 * still see the legacy table — that path will migrate when company matching
 * runs through the Python pipeline (future build).
 */

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { candidates, companies, jobs, matches } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getVerdictsForCandidate } from "@/lib/persona-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "candidate") {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.userId, session.userId),
    });
    if (!candidate) return NextResponse.json({ matches: [] });

    // Default: only surface-to-human verdicts (the strong + good buckets).
    const verdicts = await getVerdictsForCandidate(candidate.id, {
      onlySurfaceable: true,
      limit: 20,
    });

    // Shape into the legacy match-row format Workspace.tsx already consumes.
    const rows = verdicts.map(({ verdict, conversation, job, company }) => ({
      match: {
        score: Number(verdict.confidence ?? 0),
        reasoning: verdict.reasoning ?? "",
        matchDetails: {
          strengths: (verdict.evidenceFor as string[]) ?? [],
          gaps: (verdict.evidenceAgainst as string[]) ?? [],
          cultureFit: "",
          recommendation: verdict.matchVerdict,
        },
        createdAt: verdict.judgedAt?.toISOString() ?? null,
        // Extra fields beyond the legacy shape — safe for matchesToIntros to ignore.
        verdict: verdict.matchVerdict,
        conversationId: conversation.id,
        surfaceToHuman: verdict.surfaceToHuman,
      },
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        location: job.location,
        remote: job.remote,
      },
      company: {
        id: company.id,
        name: company.name,
      },
    }));

    return NextResponse.json({ matches: rows });
  }

  // Companies still use the legacy `matches` table for now (out of scope).
  if (session.role === "company") {
    const company = await db.query.companies.findFirst({
      where: eq(companies.userId, session.userId),
    });
    if (!company) return NextResponse.json({ matches: [] });

    const rows = await db
      .select({ match: matches, job: jobs, candidate: candidates })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .innerJoin(candidates, eq(matches.candidateId, candidates.id))
      .where(eq(matches.companyId, company.id))
      .limit(50);
    return NextResponse.json({ matches: rows });
  }

  return NextResponse.json({ matches: [] });
}
