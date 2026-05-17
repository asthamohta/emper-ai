import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, companies, matches, jobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.role === "candidate") {
    const candidate = await db.query.candidates.findFirst({
      where: eq(candidates.userId, session.userId),
    });
    if (!candidate) {
      return NextResponse.json({ matches: [] });
    }

    const rows = await db
      .select({
        match: matches,
        job: jobs,
        company: companies,
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .innerJoin(companies, eq(matches.companyId, companies.id))
      .where(eq(matches.candidateId, candidate.id))
      .orderBy(desc(matches.score))
      .limit(20);

    return NextResponse.json({ matches: rows });
  }

  if (session.role === "company") {
    const company = await db.query.companies.findFirst({
      where: eq(companies.userId, session.userId),
    });
    if (!company) {
      return NextResponse.json({ matches: [] });
    }

    const rows = await db
      .select({
        match: matches,
        job: jobs,
        candidate: candidates,
      })
      .from(matches)
      .innerJoin(jobs, eq(matches.jobId, jobs.id))
      .innerJoin(candidates, eq(matches.candidateId, candidates.id))
      .where(eq(matches.companyId, company.id))
      .orderBy(desc(matches.score))
      .limit(50);

    return NextResponse.json({ matches: rows });
  }

  return NextResponse.json({ matches: [] });
}
