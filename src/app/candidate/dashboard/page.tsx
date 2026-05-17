import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { candidates, matches, jobs, companies } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import MatchCard from "@/components/MatchCard";
import RefreshMatches from "./RefreshMatches";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function CandidateDashboard() {
  const session = await getSession();
  if (!session || session.role !== "candidate") redirect("/login");

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });

  if (!candidate) redirect("/candidate/onboarding");

  const matchRows = await db
    .select({ match: matches, job: jobs, company: companies })
    .from(matches)
    .innerJoin(jobs, eq(matches.jobId, jobs.id))
    .innerJoin(companies, eq(matches.companyId, companies.id))
    .where(eq(matches.candidateId, candidate.id))
    .orderBy(desc(matches.score))
    .limit(20);

  const goals = candidate.goals as Record<string, string> | null;
  const hasProfile =
    goals && Object.keys(goals).filter((k) => !k.startsWith("_")).length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Hi{candidate.name ? `, ${candidate.name.split(" ")[0]}` : ""} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {matchRows.length > 0
                ? `${matchRows.length} matches found for you`
                : "No matches yet — let's fix that"}
            </p>
          </div>
          <RefreshMatches />
        </div>

        {/* Profile incomplete nudge */}
        {!hasProfile && (
          <div className="mb-6 p-4 rounded-xl bg-violet-50 border border-violet-100 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-violet-900">
                Complete your profile for better matches
              </p>
              <p className="text-xs text-violet-600 mt-0.5">
                Upload documents and share your goals to unlock personalized matching.
              </p>
            </div>
            <Link
              href="/candidate/onboarding"
              className="shrink-0 flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-800"
            >
              Finish setup <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Matches */}
        {matchRows.length > 0 ? (
          <div className="space-y-4">
            {matchRows.map(({ match, job, company }) => (
              <MatchCard
                key={match.id}
                score={match.score}
                jobTitle={job.title}
                companyName={company.name}
                location={job.location || undefined}
                remote={job.remote}
                reasoning={match.reasoning}
                strengths={(match.matchDetails as any)?.strengths ?? []}
                gaps={(match.matchDetails as any)?.gaps ?? []}
                cultureFit={(match.matchDetails as any)?.cultureFit ?? ""}
                recommendation={(match.matchDetails as any)?.recommendation ?? "possible_match"}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No matches yet</p>
            <p className="text-sm text-gray-400 mt-1 mb-6">
              Once companies post roles, Emper will compute your matches automatically.
            </p>
            <RefreshMatches />
          </div>
        )}
      </div>
    </div>
  );
}
