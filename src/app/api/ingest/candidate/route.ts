import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments, candidateChunks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseFile, inferDocType } from "@/lib/file-parser";
import { embedBatch, serializeEmbedding } from "@/lib/embeddings";
import { chunkText } from "@/lib/utils";
import { extractCandidateContext } from "@/lib/claude";
import fs from "fs";
import path from "path";

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
  let extractedGoals: Record<string, any> = {};
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

  // If projects were extracted, persist them as a markdown document and index it
  try {
    const projects = Array.isArray(extractedGoals.projects) ? extractedGoals.projects : [];
    if (projects.length > 0) {
      const projectsMd = [
        `# Extracted Projects (${projects.length})`,
        "",
        ...projects.map((p: any, idx: number) => {
          const title = p.title || `Project ${idx + 1}`;
          const desc = p.description || "";
          const role = p.role ? `**Role:** ${p.role}` : "";
          const timeframe = p.timeframe ? `**Timeframe:** ${p.timeframe}` : "";
          const link = p.link ? `**Link:** ${p.link}` : "";
          const highlights = p.highlights
            ? p.highlights.split(",").map((h: string) => `- ${h.trim()}`).join("\n")
            : "";
          return [`## ${title}`, "", desc, "", role, timeframe, link, "", highlights, ""].join("\n");
        }),
      ].join("\n");

      const dataDir = path.join(process.cwd(), "data", "resume-projects");
      await fs.promises.mkdir(dataDir, { recursive: true });
      const filename = `resume-projects-${candidate.id}-${Date.now()}.md`;
      const filepath = path.join(dataDir, filename);
      await fs.promises.writeFile(filepath, projectsMd, "utf8");

      // Insert as a candidate document and index chunks/embeddings
      const [projDoc] = await db.insert(candidateDocuments).values({
        candidateId: candidate.id,
        filename,
        content: projectsMd.slice(0, 50000),
        docType: "other",
      }).returning();

      const projChunks = chunkText(projectsMd, 400, 50);
      if (projChunks.length > 0) {
        const projEmbeddings = await embedBatch(projChunks.slice(0, 20));
        const projRows = projChunks.slice(0, 20).map((chunk, i) => ({
          candidateId: candidate.id,
          documentId: projDoc.id,
          content: chunk,
          embedding: serializeEmbedding(projEmbeddings[i]),
        }));
        await db.insert(candidateChunks).values(projRows);
      }
    }
  } catch (err) {
    console.error("Failed to persist extracted projects:", err);
  }

  return NextResponse.json({
    ok: true,
    docsProcessed: processedDocs.length,
    extractedContext: extractedGoals,
  });
}
