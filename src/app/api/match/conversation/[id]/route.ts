/**
 * GET /api/match/conversation/[id]
 *
 * Returns a conversation + its verdict + the joined job/company context.
 * Used by /candidate/conversation/[id] (the demo's walk-away viewer) and as
 * a debug endpoint for inspecting match runs.
 */

import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  candidateConversations,
  candidateVerdicts,
  candidates,
  companies,
  jobs,
} from "@/db/schema";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // For candidates: only their own conversations.
  const candidate =
    session.role === "candidate"
      ? await db.query.candidates.findFirst({
          where: eq(candidates.userId, session.userId),
        })
      : null;

  const whereClause =
    session.role === "candidate" && candidate
      ? and(
          eq(candidateConversations.id, id),
          eq(candidateConversations.candidateId, candidate.id)
        )
      : eq(candidateConversations.id, id);

  const rows = await db
    .select({
      conversation: candidateConversations,
      verdict: candidateVerdicts,
      job: jobs,
      company: companies,
    })
    .from(candidateConversations)
    .leftJoin(
      candidateVerdicts,
      eq(candidateVerdicts.conversationId, candidateConversations.id)
    )
    .innerJoin(jobs, eq(jobs.id, candidateConversations.roleId))
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(whereClause)
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}
