import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments, users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });

  if (!candidate) {
    return NextResponse.json({
      user: { id: user.id, email: user.email },
      candidate: null,
      docCount: 0,
    });
  }

  const docs = await db
    .select({
      id: candidateDocuments.id,
      filename: candidateDocuments.filename,
      docType: candidateDocuments.docType,
      createdAt: candidateDocuments.createdAt,
    })
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, candidate.id));

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    candidate: {
      id: candidate.id,
      name: candidate.name,
      goals: candidate.goals ?? {},
      createdAt: candidate.createdAt,
    },
    docCount: docs.length,
    docs,
  });
}
