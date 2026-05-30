/**
 * GET /api/candidate/persona
 *
 * Returns the logged-in candidate's persona + freshness flag. Used by Part 5
 * UI (when implemented) and by debug tools to inspect what the Python
 * pipeline produced.
 */

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { candidates } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { getPersonaWithFreshness } from "@/lib/persona-store";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });
  if (!candidate) {
    return NextResponse.json({ persona: null, builtAt: null, isStale: false });
  }

  const result = await getPersonaWithFreshness(candidate.id);
  return NextResponse.json({
    persona: result.persona,
    builtAt: result.builtAt,
    isStale: result.isStale,
  });
}
