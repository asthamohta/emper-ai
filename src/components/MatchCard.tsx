"use client";

import { formatScore } from "@/lib/utils";
import { MapPin, Wifi, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface MatchCardProps {
  score: number;
  jobTitle: string;
  companyName: string;
  location?: string;
  remote?: boolean;
  reasoning: string;
  strengths: string[];
  gaps: string[];
  cultureFit: string;
  recommendation: string;
}

const RECOMMENDATION_COLORS: Record<string, string> = {
  strong_match: "bg-emerald-50 text-emerald-700 border-emerald-200",
  good_match: "bg-blue-50 text-blue-700 border-blue-200",
  possible_match: "bg-amber-50 text-amber-700 border-amber-200",
  weak_match: "bg-gray-50 text-gray-600 border-gray-200",
};

const RECOMMENDATION_LABELS: Record<string, string> = {
  strong_match: "Strong match",
  good_match: "Good match",
  possible_match: "Possible match",
  weak_match: "Weak match",
};

function ScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={pct >= 75 ? "#10b981" : pct >= 55 ? "#6366f1" : "#f59e0b"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
        {pct}%
      </span>
    </div>
  );
}

export default function MatchCard({
  score,
  jobTitle,
  companyName,
  location,
  remote,
  reasoning,
  strengths,
  gaps,
  cultureFit,
  recommendation,
}: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const tagClass =
    RECOMMENDATION_COLORS[recommendation] ?? RECOMMENDATION_COLORS.possible_match;
  const tagLabel =
    RECOMMENDATION_LABELS[recommendation] ?? "Possible match";

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-violet-200 hover:shadow-sm transition-all">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreRing score={score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{jobTitle}</h3>
                <p className="text-sm text-gray-500">{companyName}</p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${tagClass}`}
              >
                {tagLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              {location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {location}
                </span>
              )}
              {remote && (
                <span className="flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Remote
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600 leading-relaxed">{reasoning}</p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
        >
          {expanded ? (
            <>
              Hide details <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              See why <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50 space-y-3">
          {strengths.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Strengths
              </p>
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-emerald-500 mt-0.5">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gaps.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Gaps
              </p>
              <ul className="space-y-1">
                {gaps.map((g, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">△</span> {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cultureFit && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Culture fit
              </p>
              <p className="text-sm text-gray-700">{cultureFit}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
