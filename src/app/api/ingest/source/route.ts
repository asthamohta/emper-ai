import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments, candidateChunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { embedBatch, serializeEmbedding } from "@/lib/embeddings";
import { chunkText } from "@/lib/utils";
import {
  scrapeSource,
  writeSourceMarkdownFile,
  type SourceType,
} from "@/lib/source-scraper";

const validSources = ["website", "portfolio", "paper"] as const;

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

  const sourceTypeRaw = (body as { sourceType?: unknown }).sourceType;
  const url = (body as { url?: unknown }).url;
  if (
    !sourceTypeRaw ||
    typeof sourceTypeRaw !== "string" ||
    !validSources.includes(sourceTypeRaw as SourceType)
  ) {
    return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
  }

  const sourceType = sourceTypeRaw as SourceType;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url must be a string" }, { status: 400 });
  }

  let scraped;
  try {
    scraped = await scrapeSource(url, sourceType as SourceType);
  } catch (error) {
    console.error("Source scrape failed:", error);
    return NextResponse.json(
      { error: `Unable to scrape ${sourceType} page from ${url}` },
      { status: 502 }
    );
  }

  const filePath = await writeSourceMarkdownFile(candidate.id, scraped.filename, scraped.markdown);

  const [doc] = await db.insert(candidateDocuments).values({
    candidateId: candidate.id,
    filename: scraped.filename,
    content: scraped.markdown,
    docType: scraped.docType,
  }).returning();

  const chunks = chunkText(scraped.markdown, 400, 50).slice(0, 20);
  if (chunks.length > 0) {
    const embeddings = await embedBatch(chunks);
    const chunkRows = chunks.map((content, i) => ({
      candidateId: candidate.id,
      documentId: doc.id,
      content,
      embedding: serializeEmbedding(embeddings[i]),
    }));
    await db.insert(candidateChunks).values(chunkRows);
  }

  return NextResponse.json({
    ok: true,
    sourceType,
    url,
    filename: scraped.filename,
    filePath,
  });
}
