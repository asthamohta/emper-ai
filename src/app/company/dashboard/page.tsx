import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { companies, matches, jobs, candidates } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { formatScore } from "@/lib/utils";
import Link from "next/link";
import { Plus, Users, TrendingUp, ChevronRight } from "lucide-react";

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

  // Group matches by job
  const matchesByJob = matchRows.reduce<
    Record<string, typeof matchRows>
  >((acc, row) => {
    const jobId = row.job.id;
    if (!acc[jobId]) acc[jobId] = [];
    acc[jobId].push(row);
    return acc;
  }, {});

  const RECOMMENDATION_COLORS: Record<string, string> = {
    strong_match: "bg-emerald-50 text-emerald-700 border-emerald-200",
    good_match: "bg-blue-50 text-blue-700 border-blue-200",
    possible_match: "bg-amber-50 text-amber-700 border-amber-200",
    weak_match: "bg-gray-50 text-gray-500 border-gray-200",
  };

  const RECOMMENDATION_LABELS: Record<string, string> = {
    strong_match: "Strong",
    good_match: "Good",
    possible_match: "Possible",
    weak_match: "Weak",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {allJobs.length} active role{allJobs.length !== 1 ? "s" : ""} ·{" "}
              {matchRows.length} candidate match{matchRows.length !== 1 ? "es" : ""}
            </p>
          </div>
          <Link
            href="/company/onboarding"
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Post a role
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Roles posted",
              value: allJobs.length,
              icon: TrendingUp,
            },
            {
              label: "Total candidates",
              value: matchRows.length,
              icon: Users,
            },
            {
              label: "Strong matches",
              value: matchRows.filter(
                (r) =>
                  (r.match.matchDetails as any)?.recommendation === "strong_match"
              ).length,
              icon: TrendingUp,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* No roles state */}
        {allJobs.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Users className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No roles posted yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">
              Post your first role to start receiving candidate matches.
            </p>
            <Link
              href="/company/onboarding"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Post a role
            </Link>
          </div>
        )}

        {/* Jobs + their matches */}
        {allJobs.map((job) => {
          const jobMatches = matchesByJob[job.id] ?? [];
          return (
            <div key={job.id} className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{job.title}</h2>
                  <p className="text-xs text-gray-400">
                    {job.location || "No location set"}
                    {job.remote ? " · Remote" : ""} ·{" "}
                    {jobMatches.length} candidate{jobMatches.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {jobMatches.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                  No candidate matches yet — they'll appear as candidates sign up
                </div>
              ) : (
                <div className="space-y-2">
                  {jobMatches.map(({ match, candidate }) => {
                    const details = match.matchDetails as any;
                    const rec = details?.recommendation ?? "possible_match";
                    const tagClass = RECOMMENDATION_COLORS[rec];
                    const tagLabel = RECOMMENDATION_LABELS[rec];

                    return (
                      <div
                        key={match.id}
                        className="bg-white rounded-xl border border-gray-200 p-4 hover:border-violet-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-sm font-semibold text-violet-600 shrink-0">
                            {candidate.name?.[0]?.toUpperCase() ?? "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {candidate.name || "Anonymous candidate"}
                                </p>
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                  {match.reasoning}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tagClass}`}
                                >
                                  {tagLabel}
                                </span>
                                <span className="text-sm font-bold text-gray-700">
                                  {formatScore(match.score)}
                                </span>
                              </div>
                            </div>

                            {details?.strengths?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {details.strengths.slice(0, 3).map((s: string, i: number) => (
                                  <span
                                    key={i}
                                    className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full"
                                  >
                                    {s}
                                  </span>
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
