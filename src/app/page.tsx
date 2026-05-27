import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Workspace } from "@/components/emper/Workspace";
import { buildEmperData } from "@/components/emper/buildData";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  // Not logged in: redirect to login
  if (!session) {
    redirect("/login");
  }

  // Company users go to their existing dashboard surface.
  if (session.role === "company") {
    redirect("/company/dashboard");
  }

  // Candidate: hydrate from DB.
  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });

  // If candidate doesn't have a profile yet, send to onboarding
  if (!candidate) {
    redirect("/candidate/onboarding");
  }

  let docCount = 0;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, candidate.id));
  docCount = Number(count) || 0;

  const data = buildEmperData({
    email: session.email,
    name: candidate.name,
    goals: candidate.goals ?? null,
    docCount,
  });

  return <Workspace initial={{ liveBackend: true, data }} />;
}
