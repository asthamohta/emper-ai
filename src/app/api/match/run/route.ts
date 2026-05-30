/**
 * POST /api/match/run
 *
 * Run matches for the logged-in candidate. Replaces the deprecated
 * TS-side vector+LLM matcher with the Python four-job pipeline:
 *   pre-filter → adversarial conversation → judge.
 *
 * Per the integration plan (Q1), Python is stateless. We send full
 * candidate + role persona objects in each call; Python computes and
 * returns the verdict; we persist via saveConversationAndVerdict.
 *
 * For the demo we cap at MAX_ROLES_PER_RUN active roles per candidate run.
 * Matches run serially to keep Python's LLM concurrency predictable.
 */

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { candidates, jobs } from "@/db/schema";
import {
  AgentsClientError,
  buildRolePersona,
  runMatch,
  type RolePersona,
} from "@/lib/agents-client";
import { getSession } from "@/lib/auth";
import { getPersona, saveConversationAndVerdict } from "@/lib/persona-store";

const MAX_ROLES_PER_RUN = 10;

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const candidatePersona = await getPersona(candidate.id);
  if (!candidatePersona) {
    return NextResponse.json(
      {
        error: "No persona built yet. Upload documents or chat history first.",
      },
      { status: 412 }
    );
  }

  const activeJobs = await db.query.jobs.findMany({
    where: eq(jobs.active, true),
    limit: MAX_ROLES_PER_RUN,
  });

  if (activeJobs.length === 0) {
    return NextResponse.json({ ok: true, matchesRun: 0, verdictsCreated: 0 });
  }

  let verdictsCreated = 0;
  let prefilterKnockouts = 0;
  let errors = 0;

  for (const job of activeJobs) {
    try {
      // TODO(perf): build role personas once and cache in a job_personas
      // table. For now we rebuild per match (≈$0.03/role) — fine for demo,
      // unacceptable at scale.
      const rolePersona = await buildRoleInline(job);

      const result = await runMatch({ candidatePersona, rolePersona });

      if (!result.conversation || !result.verdict) {
        prefilterKnockouts += 1;
        continue;
      }

      await saveConversationAndVerdict({
        candidateId: candidate.id,
        roleId: job.id,
        conversation: result.conversation,
        verdict: result.verdict,
      });
      verdictsCreated += 1;
    } catch (err) {
      errors += 1;
      console.error(
        `match run failed for candidate=${candidate.id} job=${job.id}:`,
        err instanceof AgentsClientError ? err.body : err
      );
    }
  }

  return NextResponse.json({
    ok: true,
    matchesRun: activeJobs.length,
    verdictsCreated,
    prefilterKnockouts,
    errors,
  });
}

/**
 * Build a RolePersona for a job row by calling Python's stateless build
 * endpoint. Inline (not cached) — see TODO at call site.
 */
async function buildRoleInline(job: typeof jobs.$inferSelect): Promise<RolePersona> {
  const company = await db.query.companies.findFirst({
    where: (companies, { eq: e }) => e(companies.id, job.companyId),
  });

  return buildRolePersona(job.id, {
    company: {
      name: company?.name ?? "Unknown Company",
    },
    role: {
      title: job.title,
      description: job.description ?? "",
      hard_requirements: (job.hardRequirements as string[]) ?? [],
      soft_requirements: (job.softRequirements as string[]) ?? [],
      comp_range: job.compRange ?? {},
      location: job.location ?? "",
      remote: job.remote,
    },
  });
}
