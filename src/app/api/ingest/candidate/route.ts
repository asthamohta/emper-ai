import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments, candidateChunks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseFile, inferDocType } from "@/lib/file-parser";
import { embedBatch, serializeEmbedding } from "@/lib/embeddings";
import { chunkText } from "@/lib/utils";
import { extractCandidateContext } from "@/lib/claude";

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

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const processedDocs: Array<{ content: string; docType: string }> = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let content = "";

    try {
      content = await parseFile(buffer, file.name);
    } catch (err) {
      console.error(`Failed to parse ${file.name}:`, err);
      continue;
    }

    if (!content.trim()) continue;

    const docType = inferDocType(file.name);

    const [doc] = await db
      .insert(candidateDocuments)
      .values({
        candidateId: candidate.id,
        filename: file.name,
        content: content.slice(0, 50000),
        docType,
      })
      .returning();

    // Chunk and embed
    const chunks = chunkText(content, 400, 50);
    if (chunks.length > 0) {
      const embeddings = await embedBatch(chunks.slice(0, 20)); // cap at 20 chunks per doc
      const chunkRows = chunks.slice(0, 20).map((chunk, i) => ({
        candidateId: candidate.id,
        documentId: doc.id,
        content: chunk,
        embedding: serializeEmbedding(embeddings[i]),
      }));
      await db.insert(candidateChunks).values(chunkRows);
    }

    processedDocs.push({ content: content.slice(0, 3000), docType });
  }

  // Extract holistic context using Claude
  let extractedGoals: Record<string, string> = {};
  if (processedDocs.length > 0) {
    try {
      extractedGoals = await extractCandidateContext(processedDocs);
    } catch (err) {
      console.error("Context extraction failed:", err);
    }
  }

  // Update candidate with extracted context
  await db
    .update(candidates)
    .set({ goals: { ...extractedGoals, _docsProcessed: String(processedDocs.length) } })
    .where(eq(candidates.id, candidate.id));

  return NextResponse.json({
    ok: true,
    docsProcessed: processedDocs.length,
    extractedContext: extractedGoals,
  });
}
