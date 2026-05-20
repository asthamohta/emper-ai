import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import {
  candidates,
  candidateChunks,
  candidateDocuments,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

const TYPE_MAP: Record<string, string> = {
  resume: "resume",
  linkedin: "linkedin",
  sop: "sop",
  culture: "other",
  jd: "other",
  employee_cv: "other",
  other: "other",
};

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });
  if (!candidate) {
    return NextResponse.json({ documents: [] });
  }

  const rows = await db
    .select({
      id: candidateDocuments.id,
      filename: candidateDocuments.filename,
      docType: candidateDocuments.docType,
      createdAt: candidateDocuments.createdAt,
      contentLen: sql<number>`length(${candidateDocuments.content})`,
      chunkCount: sql<number>`(
        SELECT COUNT(*)::int
        FROM ${candidateChunks}
        WHERE ${candidateChunks.documentId} = ${candidateDocuments.id}
      )`,
    })
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, candidate.id));

  const documents = rows.map((r) => ({
    name: r.filename,
    type: (TYPE_MAP[r.docType] ?? "other") as
      | "resume"
      | "linkedin"
      | "sop"
      | "blog"
      | "github"
      | "other",
    date: new Date(r.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    size: r.contentLen ? `${Math.max(1, Math.round(r.contentLen / 1024))} KB` : "—",
    attrs: Number(r.chunkCount) || 0,
    attrList: [`${r.chunkCount} chunks indexed`, r.docType],
  }));

  return NextResponse.json({ documents });
}
