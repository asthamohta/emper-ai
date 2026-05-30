/**
 * Seed Maya Chen as a demo candidate.
 *
 * Adapts the Python mock_data candidate c_001 into Postgres rows: one user,
 * one candidate, four candidate_documents (github, linkedin, google_form,
 * ai_chat_history). Idempotent — re-runs skip the user-creation step if
 * the email already exists, and re-insert documents so the seed is the
 * canonical state.
 *
 * Run: npx tsx scripts/seed-demo-candidate.ts
 */

import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });

import { and, eq } from "drizzle-orm";

import { db } from "../src/db";
import {
  candidateDocuments,
  candidates,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

const EMAIL = "maya@demo.izhaar.local";
const PASSWORD = "demo-only-not-real";
const NAME = "Maya Chen";

// Synthetic 13-section behavioral profile that aligns with the Python prompt.
// Note the controlled-vocabulary section labels — these are what the
// AI_CHAT_HISTORY_EXTRACTION_PROMPT tags claims by.
const MAYA_CHAT_HISTORY = `\
Behavioral profile based on past conversations.

1. Working style
The user works in long, focused sessions, usually starting from a small,
testable hypothesis and instrumenting before changing anything. She is
uncomfortable shipping code without a benchmark.

2. Decision-making
Decisions are anchored in measurable evidence. The user routinely runs A/B
comparisons before committing to an approach. Willing to throw away two
weeks of work if a benchmark proves it was the wrong direction.

3. Communication
Direct, terse, willing to disagree in writing. Tends to ask one sharp
question rather than three vague ones. Drafts and rewrites messages to
remove softening language.

4. Collaboration
Prefers small teams. Has surfaced discomfort when more than ~5 engineers are
on the same code path. Comfortable with async / writing-first collaboration.

5. Professional goals
Wants to own a critical system end-to-end. Does not want a manager role
soon. Optimizing for ownership and learning over title.

6. Technical interests
Inference infrastructure, GPU kernels, low-level optimization. Specifically
the boundary between research and production — making research artifacts
shippable.

7. Growth areas
Not enough signal.

8. What I'm allergic to
Vague mandates. Dislikes work where impact cannot be observed directly.

9. How I handle conflict
Calmly, by restating the other position before responding. Gets frustrated
when conflict is about opinions and the other side won't commit to a
measurable comparison.

10. Risk tolerance
High for technical risk, lower for organizational risk. Wary of unclear
ownership lines.

11. Energy patterns
Strong evening and night energy. Most substantive technical writing happens
between 9pm and 2am.

12. Dealbreakers
Not enough signal in past conversations beyond what is already on the
structured form.

13. Sensitive topics
Insufficient data — skipping per privacy rules.
`;

const GITHUB_MARKDOWN = `\
# GitHub Profile: mayachen

## Top repositories
- vllm-quantization (847 stars, Python/CUDA): 8-bit quantization for vLLM inference servers. 142 commits in the last 90 days.
- transformer-from-scratch (234 stars, Python): Educational GPT-2 implementation with annotated forward/backward pass.
- inference-bench (91 stars, Python/C++): Microbenchmark suite for LLM inference servers — measures tokens/sec and tail latency.

## Language distribution
Python 65%, CUDA 18%, C++ 12%, TypeScript 5%.

## Commit pattern
Consistent weekly cadence over 18 months. 27 total public repos. 412 followers.
`;

const LINKEDIN_MARKDOWN = `\
# LinkedIn: Maya Chen

## Current role
ML Engineer at Foundry (Series A inference startup), 14 months tenure.

## Previous roles
- Software Engineer at Stripe, 28 months. Worked on payment ML risk models. Shipped a real-time fraud scoring service handling 30k QPS.

## Education
- MS Computer Science, Stanford (2023). Focus: ML systems.
- BS Computer Engineering, UIUC (2021).
`;

const FORM_MARKDOWN = `\
# Candidate Questionnaire Response

- Compensation expectations: $220-280k base, prefer equity-weighted at Series A
- Location: Bay Area, open to NYC
- What I want next: Founding ML eng or early eng at AI-first startup. Want ownership of inference layer end-to-end.
- Dealbreakers: Big company. Pure research role. Anything where I can't ship to production weekly.
- Culture preferences: Async-first. Small team. High autonomy. People who care about ML systems craft.
`;

async function upsertUser(): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, EMAIL),
  });
  if (existing) {
    console.log(`  user exists: ${existing.id}`);
    return existing.id;
  }
  const [row] = await db
    .insert(users)
    .values({
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      role: "candidate",
      onboardingComplete: true,
    })
    .returning({ id: users.id });
  console.log(`  user created: ${row.id}`);
  return row.id;
}

async function upsertCandidate(userId: string): Promise<string> {
  const existing = await db.query.candidates.findFirst({
    where: eq(candidates.userId, userId),
  });
  if (existing) {
    console.log(`  candidate exists: ${existing.id}`);
    return existing.id;
  }
  const [row] = await db
    .insert(candidates)
    .values({ userId, name: NAME, goals: {} })
    .returning({ id: candidates.id });
  console.log(`  candidate created: ${row.id}`);
  return row.id;
}

async function seedDocuments(candidateId: string) {
  const docs: Array<{
    filename: string;
    content: string;
    docType: typeof candidateDocuments.$inferInsert.docType;
  }> = [
    { filename: "github-mayachen.md", content: GITHUB_MARKDOWN, docType: "github" },
    { filename: "linkedin-maya.md", content: LINKEDIN_MARKDOWN, docType: "linkedin" },
    { filename: "candidate-form-maya.md", content: FORM_MARKDOWN, docType: "other" },
    {
      filename: "chat-history-claude-2026-05-20.md",
      content: MAYA_CHAT_HISTORY,
      docType: "ai_chat_history",
    },
  ];

  for (const d of docs) {
    // Idempotent: replace any existing same-filename row for this candidate.
    await db
      .delete(candidateDocuments)
      .where(
        and(
          eq(candidateDocuments.candidateId, candidateId),
          eq(candidateDocuments.filename, d.filename)
        )
      );
    await db.insert(candidateDocuments).values({
      candidateId,
      filename: d.filename,
      content: d.content,
      docType: d.docType,
    });
    console.log(`  doc seeded: ${d.filename} (${d.docType})`);
  }
}

async function main() {
  console.log("Seeding demo candidate Maya Chen...");
  const userId = await upsertUser();
  const candidateId = await upsertCandidate(userId);
  await seedDocuments(candidateId);
  console.log(
    `\nDONE. Candidate ID: ${candidateId}\n` +
      `Login: ${EMAIL} / ${PASSWORD}\n` +
      `Trigger persona build next via:\n` +
      `  curl -X POST http://localhost:3000/api/_dev/rebuild-persona/${candidateId}\n` +
      `(or via the dashboard once you log in)`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
