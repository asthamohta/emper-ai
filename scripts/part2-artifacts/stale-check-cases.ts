/**
 * Produce a JSON artifact showing the 4 freshness cases.
 *
 *   1. No persona, no docs  → isStale = false
 *   2. No persona, ≥1 doc   → isStale = true
 *   3. Persona, no newer doc → isStale = false
 *   4. Persona, ≥1 newer doc → isStale = true
 */

import { eq } from "drizzle-orm";
import fs from "fs";

import { db } from "../../src/db";
import {
  candidateDocuments,
  candidatePersonas,
  candidates,
  users,
} from "../../src/db/schema";
import { hashPassword } from "../../src/lib/auth";
import { getPersonaWithFreshness } from "../../src/lib/persona-store";

async function ensureUser(email: string, role: "candidate" | "company") {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) return existing.id;
  const [row] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword("test-only"),
      role,
      onboardingComplete: true,
    })
    .returning();
  return row.id;
}

async function ensureCandidate(userId: string, name: string) {
  const existing = await db.query.candidates.findFirst({
    where: eq(candidates.userId, userId),
  });
  if (existing) return existing.id;
  const [row] = await db
    .insert(candidates)
    .values({ userId, name })
    .returning();
  return row.id;
}

async function main() {
  const out: Record<string, unknown> = {};

  // Case 1: brand-new candidate, no persona, no docs.
  const u1 = await ensureUser("freshness1@demo.izhaar.local", "candidate");
  const c1 = await ensureCandidate(u1, "Case1");
  await db.delete(candidateDocuments).where(eq(candidateDocuments.candidateId, c1));
  await db.delete(candidatePersonas).where(eq(candidatePersonas.candidateId, c1));
  out["case1_no_persona_no_docs"] = await getPersonaWithFreshness(c1);

  // Case 2: candidate with a doc but no persona built.
  const u2 = await ensureUser("freshness2@demo.izhaar.local", "candidate");
  const c2 = await ensureCandidate(u2, "Case2");
  await db.delete(candidateDocuments).where(eq(candidateDocuments.candidateId, c2));
  await db.delete(candidatePersonas).where(eq(candidatePersonas.candidateId, c2));
  await db
    .insert(candidateDocuments)
    .values({ candidateId: c2, filename: "x.md", content: "...", docType: "other" });
  out["case2_no_persona_has_docs"] = await getPersonaWithFreshness(c2);

  // Cases 3 & 4: existing Maya. case 3 is current state (persona is fresh
  // because we just rebuilt and no new docs since), case 4 we manufacture by
  // inserting a brand-new doc.
  const maya = await db.query.users.findFirst({
    where: eq(users.email, "maya@demo.izhaar.local"),
  });
  if (maya) {
    const m = await db.query.candidates.findFirst({
      where: eq(candidates.userId, maya.id),
    });
    if (m) {
      out["case3_persona_no_newer_doc"] = await getPersonaWithFreshness(m.id);

      // Insert a fresh doc to make persona stale.
      const [newDoc] = await db
        .insert(candidateDocuments)
        .values({
          candidateId: m.id,
          filename: "freshness-test-doc.md",
          content: "stale-trigger",
          docType: "other",
        })
        .returning();
      out["case4_persona_has_newer_doc"] = await getPersonaWithFreshness(m.id);
      // Clean up so we don't pollute real data.
      await db.delete(candidateDocuments).where(eq(candidateDocuments.id, newDoc.id));
    }
  }

  fs.writeFileSync(
    "scripts/part2-artifacts/stale-check-results.json",
    JSON.stringify(out, null, 2)
  );
  console.log("saved stale-check-results.json");
  for (const [k, v] of Object.entries(out)) {
    const r = v as { isStale: boolean; builtAt: Date | string | null };
    console.log(
      `  ${k}: isStale=${r.isStale} builtAt=${r.builtAt ?? "null"}`
    );
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
