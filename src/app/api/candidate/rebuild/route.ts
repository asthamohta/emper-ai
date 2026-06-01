import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { triggerPersonaRebuild } from "@/lib/persona-rebuild";

export async function POST() {
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

  triggerPersonaRebuild(candidate.id).catch((err) =>
    console.error(`manual rebuild failed for ${candidate.id}:`, err)
  );

  return NextResponse.json({ ok: true, candidateId: candidate.id });
}
