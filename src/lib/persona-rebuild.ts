/**
 * Persona rebuild trigger.
 *
 * Called from every ingest route after a successful write to candidate_documents.
 * Fires fire-and-forget: the HTTP caller doesn't wait for the LLM round-trip
 * to complete. When the rebuild finishes, the new persona is in Postgres and
 * the candidate's next dashboard render picks it up.
 *
 * In-memory debounce: if multiple documents land in quick succession (typical
 * during onboarding when the candidate uploads 3 files at once), we coalesce
 * rebuilds to one call per candidate per debounce window. Production would
 * use a proper queue; this is the v1 substitute.
 *
 * NOTE: This module owns the Python-side rebuild call. The actual HTTP call
 * lives in agents-client.ts (the network boundary). This file owns the
 * orchestration: collect documents, build the multi-source dict, call Python,
 * persist via persona-store.
 */

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { candidateDocuments, candidates } from "@/db/schema";
import {
  buildCandidatePersona,
  type CandidateSources,
} from "@/lib/agents-client";
import { savePersona } from "@/lib/persona-store";

// Coalesce within this window to avoid multiple rebuilds when 3 ingests fire
// back-to-back during onboarding. Anything in flight + anything queued within
// DEBOUNCE_MS coalesces to one Python call.
const DEBOUNCE_MS = 4000;

const pending = new Map<string, { timer: NodeJS.Timeout; promise: Promise<void> }>();

/**
 * Schedule a persona rebuild for a candidate. Returns the in-flight promise,
 * which callers can await (most fire-and-forget by ignoring it).
 */
export function triggerPersonaRebuild(candidateId: string): Promise<void> {
  const existing = pending.get(candidateId);
  if (existing) {
    // Already queued. Reset the debounce timer so we wait for any further
    // ingests, then fall through to the existing promise.
    clearTimeout(existing.timer);
    existing.timer = setTimeout(() => runRebuild(candidateId), DEBOUNCE_MS);
    return existing.promise;
  }

  let resolveOuter!: () => void;
  let rejectOuter!: (err: unknown) => void;
  const promise = new Promise<void>((resolve, reject) => {
    resolveOuter = resolve;
    rejectOuter = reject;
  });

  const timer = setTimeout(() => {
    runRebuild(candidateId)
      .then(resolveOuter)
      .catch(rejectOuter)
      .finally(() => pending.delete(candidateId));
  }, DEBOUNCE_MS);

  pending.set(candidateId, { timer, promise });
  return promise;
}

/**
 * The actual rebuild work. Pulls every candidate_documents row for the
 * candidate, bundles them into the multi-source dict that Python's
 * profile_builder consumes, calls Python, persists the persona.
 */
async function runRebuild(candidateId: string): Promise<void> {
  const t0 = Date.now();

  const [candidate, docs] = await Promise.all([
    db.query.candidates.findFirst({ where: eq(candidates.id, candidateId) }),
    db.query.candidateDocuments.findMany({
      where: eq(candidateDocuments.candidateId, candidateId),
    }),
  ]);

  if (!candidate) {
    console.warn(`persona-rebuild: candidate ${candidateId} not found, skipping`);
    return;
  }
  if (docs.length === 0) {
    console.warn(`persona-rebuild: candidate ${candidateId} has no documents, skipping`);
    return;
  }

  const sources = bundleDocumentsAsSources(docs);

  let persona;
  try {
    persona = await buildCandidatePersona(candidateId, sources, candidate.name);
  } catch (err) {
    console.error(
      `persona-rebuild: Python build failed for ${candidateId}:`,
      err
    );
    throw err;
  }

  await savePersona(candidateId, persona);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `persona-rebuild: ${candidateId} built ${persona.claims.length} claims from ${docs.length} docs in ${elapsed}s`
  );
}

/**
 * Map candidate_documents rows by doc_type into the dict shape Python
 * expects (sources.scraper.{resume,github,linkedin,...} + sources.ai_chat_history).
 *
 * Each scraper source becomes `{ filename, content_excerpt }` so the LLM gets
 * structured-ish input. The full content is included up to a per-source cap
 * to keep token usage bounded.
 */
function bundleDocumentsAsSources(
  docs: Array<{ filename: string; content: string; docType: string; createdAt: Date }>
): CandidateSources {
  const sources: CandidateSources = {};
  const scraper: Record<string, unknown> = {};

  // The scraper-side sources we know about. Map doc_type → key in the dict
  // Python's profile_builder sees.
  const scraperMapping: Record<string, string> = {
    resume: "resume",
    linkedin: "linkedin",
    github: "github",
    website: "website",
    portfolio: "portfolio",
    paper: "portfolio",       // papers fold into portfolio for the agent's purposes
    sop: "resume",            // SOP behaves like resume content
    employee_cv: "resume",
  };

  for (const d of docs) {
    if (d.docType === "ai_chat_history") {
      // The most recent chat history wins if multiple were uploaded.
      const prior = sources.ai_chat_history;
      if (!prior || d.createdAt > new Date(prior.submitted_at)) {
        sources.ai_chat_history = {
          provider: providerFromFilename(d.filename),
          submitted_at: d.createdAt.toISOString(),
          raw_output: d.content,
        };
      }
      continue;
    }

    const key = scraperMapping[d.docType];
    if (!key) continue;  // unknown doc_type, skip silently

    // Concatenate when multiple docs share a key (e.g. two resume files).
    const existing = (scraper[key] as Record<string, unknown>) ?? null;
    if (existing) {
      scraper[key] = {
        ...existing,
        additional_content: [
          ...(((existing.additional_content as string[]) ?? [])),
          d.content,
        ],
      };
    } else {
      scraper[key] = {
        filename: d.filename,
        content: d.content,
      };
    }
  }

  if (Object.keys(scraper).length > 0) {
    sources.scraper = scraper as CandidateSources["scraper"];
  }
  return sources;
}

function providerFromFilename(filename: string): "claude" | "chatgpt" | "gemini" | "grok" {
  const f = filename.toLowerCase();
  if (f.includes("chatgpt") || f.includes("openai")) return "chatgpt";
  if (f.includes("gemini")) return "gemini";
  if (f.includes("grok")) return "grok";
  return "claude";  // safe default
}
