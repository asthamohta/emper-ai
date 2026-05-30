/**
 * POST /api/ingest/chat-history
 *
 * Candidate pastes the 13-section behavioral profile they got from another AI
 * (Claude / ChatGPT / Gemini / Grok). We persist it as a candidate_documents
 * row with doc_type = "ai_chat_history", drop an audit copy to disk to match
 * the existing ingest pattern, and fire the persona-rebuild trigger.
 *
 * Body: { provider: "claude"|"chatgpt"|"gemini"|"grok", rawText: string }
 *
 * Returns: { ok: true, documentId, contentLength, personaRebuildScheduled }
 */

import fs from "fs";
import path from "path";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { candidates, candidateDocuments } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { triggerPersonaRebuild } from "@/lib/persona-rebuild";

const MIN_LEN = 500;
const MAX_LEN = 50_000;
const ALLOWED_PROVIDERS = new Set(["claude", "chatgpt", "gemini", "grok"] as const);

export async function POST(request: Request) {
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

  let body: { provider?: string; rawText?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const provider = body.provider;
  const rawText = (body.rawText ?? "").trim();

  if (!provider || !ALLOWED_PROVIDERS.has(provider as never)) {
    return NextResponse.json(
      { error: `provider must be one of: ${[...ALLOWED_PROVIDERS].join(", ")}` },
      { status: 400 }
    );
  }
  if (rawText.length < MIN_LEN) {
    return NextResponse.json(
      { error: `rawText must be at least ${MIN_LEN} chars (got ${rawText.length})` },
      { status: 400 }
    );
  }
  if (rawText.length > MAX_LEN) {
    return NextResponse.json(
      { error: `rawText must be at most ${MAX_LEN} chars (got ${rawText.length})` },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const filename = `chat-history-${provider}-${today}.md`;

  // 1. Insert into Postgres.
  const [doc] = await db
    .insert(candidateDocuments)
    .values({
      candidateId: candidate.id,
      filename,
      content: rawText,
      docType: "ai_chat_history",
    })
    .returning();

  // 2. Audit-copy to disk to match the existing ingest pattern.
  try {
    const dir = path.join(process.cwd(), "data", "chat-history");
    await fs.promises.mkdir(dir, { recursive: true });
    const auditName = `${candidate.id}-${Date.now()}-${provider}.md`;
    await fs.promises.writeFile(path.join(dir, auditName), rawText, "utf8");
  } catch (err) {
    // Non-fatal: Postgres has the canonical copy.
    console.error("chat-history audit write failed:", err);
  }

  // 3. Fire persona rebuild (fire-and-forget — caller doesn't wait).
  triggerPersonaRebuild(candidate.id).catch((err) =>
    console.error(`persona rebuild failed for ${candidate.id}:`, err)
  );

  return NextResponse.json({
    ok: true,
    documentId: doc.id,
    contentLength: rawText.length,
    personaRebuildScheduled: true,
  });
}
