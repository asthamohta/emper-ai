import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { companies, matches, jobs, candidates } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { formatScore } from "@/lib/utils";
import Link from "next/link";

export default async function CompanyDashboard() {
  const session = await getSession();
  if (!session || session.role !== "company") redirect("/login");

  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.userId),
  });
  if (!company) redirect("/company/onboarding");

  const allJobs = await db.query.jobs.findMany({
    where: eq(jobs.companyId, company.id),
    orderBy: [desc(jobs.createdAt)],
  });

  const matchRows = await db
    .select({ match: matches, job: jobs, candidate: candidates })
    .from(matches)
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .innerJoin(candidates, eq(matches.candidateId, candidates.id))
    .where(eq(matches.companyId, company.id))
    .orderBy(desc(matches.score))
    .limit(50);

  const matchesByJob = matchRows.reduce<Record<string, typeof matchRows>>((acc, row) => {
    const jobId = row.job.id;
    if (!acc[jobId]) acc[jobId] = [];
    acc[jobId].push(row);
    return acc;
  }, {});

  const REC_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
    strong_match:   { label: "Strong",   color: "var(--good)",    bg: "rgba(124,255,178,0.07)", border: "rgba(124,255,178,0.25)" },
    good_match:     { label: "Good",     color: "var(--accent)",  bg: "rgba(212,165,116,0.07)", border: "rgba(212,165,116,0.3)"  },
    possible_match: { label: "Possible", color: "var(--warn)",    bg: "rgba(251,191,36,0.07)",  border: "rgba(251,191,36,0.25)"  },
    weak_match:     { label: "Weak",     color: "var(--text-dim)", bg: "transparent",            border: "var(--border)"          },
  };

  const strongCount = matchRows.filter(
    (r) => (r.match.matchDetails as any)?.recommendation === "strong_match"
  ).length;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="font-serif-h text-[36px] leading-tight tracking-tight">{company.name}</h1>
            <p className="font-mono text-[11.5px] text-faint mt-1.5">
              {allJobs.length} active role{allJobs.length !== 1 ? "s" : ""}
              <span className="mx-2">·</span>
              {matchRows.length} candidate match{matchRows.length !== 1 ? "es" : ""}
            </p>
          </div>
          <Link href="/company/onboarding" className="btn btn-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            post a role
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-10">
          {[
            { label: "roles posted",    value: allJobs.length },
            { label: "total candidates", value: matchRows.length },
            { label: "strong matches",   value: strongCount },
          ].map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className="font-serif-h text-[36px] leading-none" style={{ fontWeight: 300, color: "var(--accent)" }}>
                {stat.value}
              </div>
              <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {allJobs.length === 0 && (
          <div
            className="rounded-lg border-2 border-dashed py-20 text-center"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="font-serif-h text-[20px] text-dim mb-2">No roles posted yet</div>
            <p className="font-mono text-[11.5px] text-faint mb-6">
              Post your first role to start receiving candidate matches.
            </p>
            <Link href="/company/onboarding" className="btn btn-accent">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              post a role
            </Link>
          </div>
        )}

        {/* Jobs + matches */}
        {allJobs.map((job) => {
          const jobMatches = matchesByJob[job.id] ?? [];
          return (
            <div key={job.id} className="mb-10">
              <div className="flex items-baseline justify-between mb-4">
                <div>
                  <h2 className="font-serif-h text-[20px]">{job.title}</h2>
                  <p className="font-mono text-[11px] text-faint mt-0.5">
                    {job.location || "no location"}
                    {job.remote ? " · remote" : ""}
                    <span className="mx-2">·</span>
                    {jobMatches.length} candidate{jobMatches.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {jobMatches.length === 0 ? (
                <div
                  className="rounded-lg border border-dashed py-10 text-center font-mono text-[11.5px] text-faint"
                  style={{ borderColor: "var(--border)" }}
                >
                  No matches yet — they'll appear as candidates sign up
                </div>
              ) : (
                <div className="space-y-2">
                  {jobMatches.map(({ match, candidate }) => {
                    const details = match.matchDetails as any;
                    const rec = details?.recommendation ?? "possible_match";
                    const style = REC_STYLE[rec] ?? REC_STYLE.possible_match;
                    const pct = Math.round(match.score * 100);

                    return (
                      <div
                        key={match.id}
                        className="card p-4 hover:border-[rgba(212,165,116,0.3)] transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-serif-h text-[16px] shrink-0"
                            style={{ background: "rgba(212,165,116,0.1)", color: "var(--accent)" }}
                          >
                            {candidate.name?.[0]?.toUpperCase() ?? "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-serif-h text-[15px]">
                                  {candidate.name || "Anonymous candidate"}
                                </p>
                                <p className="font-mono text-[11px] text-faint mt-0.5 line-clamp-1">
                                  {match.reasoning}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded"
                                  style={{ color: style.color, background: style.bg, border: `1px solid ${style.border}` }}
                                >
                                  {style.label}
                                </span>
                                <span
                                  className="font-mono text-[13px] font-bold"
                                  style={{ color: pct >= 75 ? "var(--good)" : pct >= 55 ? "var(--accent)" : "var(--warn)" }}
                                >
                                  {pct}%
                                </span>
                              </div>
                            </div>

                            {details?.strengths?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {details.strengths.slice(0, 3).map((s: string, i: number) => (
                                  <span key={i} className="chip chip-accent">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
