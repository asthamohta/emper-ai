// DEPRECATED as of 2026-05-28.
// This file's exports are no longer called by the app.
// All matching now flows through src/lib/agents-client.ts → Python pipeline
// (izhaar-agents/). Verdicts live in candidate_verdicts, transcripts in
// candidate_conversations. The `matches` table is still written for
// backward compat on the company side; that path will migrate next.
// Kept for reference until the Python pipeline is fully validated in production.

import { db } from "@/db";
import {
  candidates,
  jobs,
  matches,
  companies,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { deserializeEmbedding, cosineSimilarity } from "./embeddings";
import { scoreMatch } from "./claude";

export async function runMatchesForCandidate(candidateId: string) {
  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.id, candidateId),
    with: { chunks: true },
  });
  if (!candidate) throw new Error("Candidate not found");

  const allJobs = await db.query.jobs.findMany({
    where: eq(jobs.active, true),
    with: { chunks: true },
  });

  const results = [];

  for (const job of allJobs) {
    if (!job.chunks?.length || !candidate.chunks?.length) continue;

    // Compute average cosine similarity across chunk pairs
    const candidateVecs = candidate.chunks
      .map((c) => {
        try {
          return deserializeEmbedding(c.embedding);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as number[][];

    const jobVecs = job.chunks
      .map((c) => {
        try {
          return deserializeEmbedding(c.embedding);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as number[][];

    if (!candidateVecs.length || !jobVecs.length) continue;

    // Average of best-matching pairs (asymmetric: for each candidate chunk, find best job chunk)
    let totalSim = 0;
    for (const cv of candidateVecs) {
      const best = Math.max(...jobVecs.map((jv) => cosineSimilarity(cv, jv)));
      totalSim += best;
    }
    const vectorScore = totalSim / candidateVecs.length;

    // Use Claude for detailed scoring (only for top candidates by vector score)
    const candidateContext = JSON.stringify(candidate.goals ?? {});
    const jobContext = `Title: ${job.title}\nDescription: ${job.description}\nHard requirements: ${JSON.stringify(job.hardRequirements)}\nSoft requirements: ${JSON.stringify(job.softRequirements)}`;
    const candidateGoals = JSON.stringify(candidate.goals ?? {});

    let llmResult;
    try {
      llmResult = await scoreMatch(candidateContext, jobContext, candidateGoals);
    } catch {
      llmResult = {
        score: vectorScore,
        reasoning: "Vector similarity match.",
        strengths: [],
        gaps: [],
        cultureFit: "",
        recommendation: "possible_match",
      };
    }

    // Combined score: 40% vector + 60% LLM
    const finalScore = vectorScore * 0.4 + llmResult.score * 0.6;

    results.push({
      jobId: job.id,
      companyId: job.companyId,
      score: finalScore,
      llmResult,
    });
  }

  // Upsert matches
  for (const r of results) {
    await db
      .insert(matches)
      .values({
        candidateId,
        jobId: r.jobId,
        companyId: r.companyId,
        score: r.score,
        reasoning: r.llmResult.reasoning,
        matchDetails: {
          strengths: r.llmResult.strengths,
          gaps: r.llmResult.gaps,
          cultureFit: r.llmResult.cultureFit,
          recommendation: r.llmResult.recommendation,
        },
      })
      .onConflictDoUpdate({
        target: [matches.candidateId, matches.jobId],
        set: {
          score: r.score,
          reasoning: r.llmResult.reasoning,
          matchDetails: {
            strengths: r.llmResult.strengths,
            gaps: r.llmResult.gaps,
            cultureFit: r.llmResult.cultureFit,
            recommendation: r.llmResult.recommendation,
          },
        },
      });
  }

  return results;
}
