import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { companies, companyDocuments, jobs, jobChunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { parseFile } from "@/lib/file-parser";
import { embedBatch, serializeEmbedding } from "@/lib/embeddings";
import { chunkText } from "@/lib/utils";
import { z } from "zod";

const requirementsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  hardRequirements: z.array(z.string()).optional().default([]),
  softRequirements: z.array(z.string()).optional().default([]),
  location: z.string().optional().default(""),
  remote: z.boolean().optional().default(false),
  compMin: z.number().optional().default(0),
  compMax: z.number().optional().default(0),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "company") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.userId),
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files") as File[];
  const requirementsRaw = formData.get("requirements");

  let requirements = {
    title: "Open Position",
    description: "",
    hardRequirements: [] as string[],
    softRequirements: [] as string[],
    location: "",
    remote: false,
    compMin: 0,
    compMax: 0,
  };

  if (requirementsRaw) {
    try {
      requirements = requirementsSchema.parse(JSON.parse(requirementsRaw as string));
    } catch {}
  }

  // Create or update the job posting
  const [job] = await db
    .insert(jobs)
    .values({
      companyId: company.id,
      title: requirements.title,
      description: requirements.description,
      hardRequirements: requirements.hardRequirements,
      softRequirements: requirements.softRequirements,
      location: requirements.location,
      remote: requirements.remote,
      compRange: {
        min: requirements.compMin,
        max: requirements.compMax,
        currency: "USD",
      },
    })
    .returning();

  // Process uploaded documents
  const allChunkTexts: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let content = "";

    try {
      content = await parseFile(buffer, file.name);
    } catch {
      continue;
    }

    if (!content.trim()) continue;

    await db.insert(companyDocuments).values({
      companyId: company.id,
      jobId: job.id,
      filename: file.name,
      content: content.slice(0, 50000),
      docType: "other",
    });

    allChunkTexts.push(...chunkText(content, 400, 50).slice(0, 15));
  }

  // Also embed the job description itself
  const jobText = `${job.title}\n${job.description}\nRequired: ${requirements.hardRequirements.join(", ")}\nPreferred: ${requirements.softRequirements.join(", ")}`;
  allChunkTexts.unshift(jobText);

  if (allChunkTexts.length > 0) {
    const capped = allChunkTexts.slice(0, 30);
    const embeddings = await embedBatch(capped);
    const chunkRows = capped.map((content, i) => ({
      jobId: job.id,
      companyId: company.id,
      content,
      embedding: serializeEmbedding(embeddings[i]),
    }));
    await db.insert(jobChunks).values(chunkRows);
  }

  return NextResponse.json({ ok: true, jobId: job.id });
}
