import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments, candidateChunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { embedBatch, serializeEmbedding } from "@/lib/embeddings";
import { chunkText } from "@/lib/utils";
import {
  buildGithubMarkdown,
  fetchGithubEvidence,
  normalizeGithubHandle,
  writeGithubMarkdownFile,
} from "@/lib/github-scraper";
import { synthesizeProjectsForCandidate } from "@/lib/github-analyzer";

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

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Missing request body" }, { status: 400 });
  }

  const githubUsername = (body as { githubUsername?: unknown }).githubUsername;
  if (!githubUsername || typeof githubUsername !== "string") {
    return NextResponse.json(
      { error: "githubUsername must be a string" },
      { status: 400 }
    );
  }

  const normalized = normalizeGithubHandle(githubUsername);
  if (!normalized) {
    return NextResponse.json(
      { error: "Invalid GitHub username" },
      { status: 400 }
    );
  }

  let evidence;
  try {
    evidence = await fetchGithubEvidence(normalized);
  } catch (error) {
    console.error("GitHub fetch failed:", error);
    return NextResponse.json(
      { error: `Unable to fetch GitHub data for ${normalized}` },
      { status: 502 }
    );
  }

  const markdown = buildGithubMarkdown(normalized, evidence);
  const filePath = await writeGithubMarkdownFile(candidate.id, normalized, markdown);

  // Synthesize structured projects + insights and persist if any new insights found
  try {
    await synthesizeProjectsForCandidate(candidate.id, normalized);
  } catch (err) {
    console.error("Project synthesis failed:", err);
  }

  const [doc] = await db.insert(candidateDocuments).values({
    candidateId: candidate.id,
    filename: `github-${normalized}.md`,
    content: markdown,
    docType: "github",
  }).returning();

  const chunks = chunkText(markdown, 400, 50).slice(0, 20);
  if (chunks.length > 0) {
    const embeddings = await embedBatch(chunks);
    const chunkRows = chunks.map((chunk, i) => ({
      candidateId: candidate.id,
      documentId: doc.id,
      content: chunk,
      embedding: serializeEmbedding(embeddings[i]),
    }));
    await db.insert(candidateChunks).values(chunkRows);
  }

  return NextResponse.json({
    ok: true,
    githubUsername: normalized,
    filename: `github-${normalized}.md`,
    filePath,
  });
}
