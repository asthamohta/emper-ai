/**
 * End-to-end demo run.
 *
 * Assumes:
 *   - Postgres is up.
 *   - The Python agent service is running (default localhost:8000).
 *   - seed-demo-candidate.ts and seed-demo-roles.ts have been run.
 *
 * Steps:
 *   1. Pull Maya's candidate row + documents from Postgres.
 *   2. Bundle docs into the multi-source dict and call Python
 *      (POST /api/v1/build/candidate-from-payload). Persist via savePersona.
 *   3. For each seeded job: build role persona inline (calling Python),
 *      then run a match. Persist conversation + verdict.
 *   4. Print a summary table to stdout.
 *
 * Cost: roughly ~$0.10–0.20 for the persona build + ~$0.15–0.25 per match
 * (8–12 turn conversation + judge), so ~$0.40–0.70 for the whole run.
 *
 * Run:
 *   node_modules/.bin/tsx --env-file=.env.local scripts/run-demo-e2e.ts
 */

import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { candidateDocuments, candidates, jobs, companies } from "../src/db/schema";
import {
  buildCandidatePersona,
  buildRolePersona,
  runMatch,
  type CandidateSources,
} from "../src/lib/agents-client";
import {
  savePersona,
  saveConversationAndVerdict,
} from "../src/lib/persona-store";

const CANDIDATE_EMAIL = "maya@demo.izhaar.local";

async function main() {
  const t0 = Date.now();

  // 1. Resolve Maya's candidate row.
  const cand = await db.execute(
    /* sql */ `SELECT c.id, c.name
               FROM candidates c
               JOIN users u ON u.id = c.user_id
               WHERE u.email = '${CANDIDATE_EMAIL}'`
  );
  if (cand.rows.length === 0) {
    console.error(
      `Candidate ${CANDIDATE_EMAIL} not found. Run scripts/seed-demo-candidate.ts first.`
    );
    process.exit(1);
  }
  const candidateId = (cand.rows[0] as { id: string }).id;
  const candidateName = (cand.rows[0] as { name: string }).name;
  console.log(`Candidate: ${candidateName} (${candidateId})`);

  // 2. Build the multi-source dict from candidate_documents.
  const docs = await db.query.candidateDocuments.findMany({
    where: eq(candidateDocuments.candidateId, candidateId),
  });
  console.log(`  documents: ${docs.length}`);
  for (const d of docs) console.log(`    - ${d.docType.padEnd(18)} ${d.filename}`);

  const sources = bundleSources(docs);

  // 3. Build persona.
  console.log("\nBuilding candidate persona (multi-source)...");
  const bp = Date.now();
  const persona = await buildCandidatePersona(candidateId, sources, candidateName);
  console.log(
    `  OK in ${((Date.now() - bp) / 1000).toFixed(1)}s · ${persona.claims.length} claims · ` +
      `${persona.explicit_gaps.length} gaps`
  );

  const corr = persona.claims.filter((c) => c.corroboration_count >= 2).length;
  const disc = persona.claims.filter((c) => c.discrepancy_flag != null).length;
  console.log(`  corroborated: ${corr} · discrepancies: ${disc}`);

  // 4. Persist persona (also dual-writes to candidates.goals).
  await savePersona(candidateId, persona);
  console.log("  persona saved.");

  // 5. For each active job, build role persona inline and run a match.
  const activeJobs = await db
    .select({ job: jobs, company: companies })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(eq(jobs.active, true))
    .limit(10);
  console.log(`\nActive jobs to match against: ${activeJobs.length}`);

  type MatchSummary = {
    job: string;
    company: string;
    prefilter: string;
    verdict: string;
    confidence: string;
    turns: number | string;
    walkedAwayBy: string;
    cost: string;
  };
  const summaries: MatchSummary[] = [];

  for (const { job, company } of activeJobs) {
    const label = `${company.name} · ${job.title}`;
    console.log(`\n--- ${label} ---`);

    const rb = Date.now();
    const rolePersona = await buildRolePersona(job.id, {
      company: { name: company.name },
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
    console.log(`  role persona built in ${((Date.now() - rb) / 1000).toFixed(1)}s`);

    const mp = Date.now();
    const result = await runMatch({
      candidatePersona: persona,
      rolePersona,
    });
    const matchSeconds = ((Date.now() - mp) / 1000).toFixed(1);
    console.log(`  match run in ${matchSeconds}s`);

    if (!result.conversation || !result.verdict) {
      console.log(
        `  PRE-FILTER blocked the match (score ${result.prefilter.score.toFixed(2)})`
      );
      summaries.push({
        job: job.title,
        company: company.name,
        prefilter: `BLOCKED (${result.prefilter.score.toFixed(2)})`,
        verdict: "—",
        confidence: "—",
        turns: "—",
        walkedAwayBy: "—",
        cost: "$0.00",
      });
      continue;
    }

    await saveConversationAndVerdict({
      candidateId,
      roleId: job.id,
      conversation: result.conversation,
      verdict: result.verdict,
    });
    console.log(
      `  verdict: ${result.verdict.match_verdict} (conf ${result.verdict.confidence.toFixed(2)}) · ` +
        `surface=${result.verdict.surface_to_human}`
    );
    summaries.push({
      job: job.title,
      company: company.name,
      prefilter: `PASS (${result.prefilter.score.toFixed(2)})`,
      verdict: result.verdict.match_verdict,
      confidence: result.verdict.confidence.toFixed(2),
      turns: result.conversation.turn_count,
      walkedAwayBy: result.conversation.walked_away_by ?? "—",
      cost: `$${result.conversation.cost_usd.toFixed(4)}`,
    });
  }

  console.log("\n========== SUMMARY ==========");
  console.log(
    "company".padEnd(15) +
      " | " +
      "verdict".padEnd(12) +
      " | " +
      "conf".padEnd(5) +
      " | " +
      "turns".padEnd(5) +
      " | " +
      "walked".padEnd(10) +
      " | " +
      "cost"
  );
  for (const s of summaries) {
    console.log(
      `${s.company.padEnd(15)} | ${s.verdict.padEnd(12)} | ${String(s.confidence).padEnd(5)} | ` +
        `${String(s.turns).padEnd(5)} | ${s.walkedAwayBy.padEnd(10)} | ${s.cost}`
    );
  }
  console.log(`\nTotal wall time: ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  process.exit(0);
}

function bundleSources(
  docs: Array<{ filename: string; content: string; docType: string; createdAt: Date }>
): CandidateSources {
  const sources: CandidateSources = {};
  const scraper: Record<string, unknown> = {};

  const mapping: Record<string, string> = {
    resume: "resume",
    linkedin: "linkedin",
    github: "github",
    website: "website",
    portfolio: "portfolio",
    paper: "portfolio",
    sop: "resume",
    employee_cv: "resume",
  };

  for (const d of docs) {
    if (d.docType === "ai_chat_history") {
      sources.ai_chat_history = {
        provider: "claude",
        submitted_at: d.createdAt.toISOString(),
        raw_output: d.content,
      };
      continue;
    }
    const key = mapping[d.docType];
    if (!key) continue;
    scraper[key] = { filename: d.filename, content: d.content };
  }
  if (Object.keys(scraper).length > 0) {
    sources.scraper = scraper as CandidateSources["scraper"];
  }
  return sources;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
