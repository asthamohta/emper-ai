import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Workspace } from "@/components/emper/Workspace";
import { MOCK } from "@/components/emper/data";
import { buildEmperData } from "@/components/emper/buildData";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await getSession();

  // Company users go to their existing dashboard surface.
  if (session?.role === "company") {
    redirect("/company/dashboard");
  }

  // Logged-out: serve the workspace as a demo with MOCK data.
  if (!session) {
    return (
      <Workspace initial={{ liveBackend: false, data: MOCK }} />
    );
  }

  // Candidate: hydrate from DB.
  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });

  let docCount = 0;
  if (candidate) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(candidateDocuments)
      .where(eq(candidateDocuments.candidateId, candidate.id));
    docCount = Number(count) || 0;
  }

  const data = buildEmperData({
    email: session.email,
    name: candidate?.name,
    goals: candidate?.goals ?? null,
    docCount,
  });

  return <Workspace initial={{ liveBackend: true, data }} />;
}
