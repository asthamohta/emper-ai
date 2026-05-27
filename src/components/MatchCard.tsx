"use client";

import { formatScore } from "@/lib/utils";
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

const REC_STYLE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  strong_match:   { label: "Strong",   color: "var(--good)",    bg: "rgba(124,255,178,0.07)", border: "rgba(124,255,178,0.25)" },
  good_match:     { label: "Good",     color: "var(--accent)",  bg: "rgba(212,165,116,0.07)", border: "rgba(212,165,116,0.3)"  },
  possible_match: { label: "Possible", color: "var(--warn)",    bg: "rgba(251,191,36,0.07)",  border: "rgba(251,191,36,0.25)"  },
  weak_match:     { label: "Weak",     color: "var(--text-dim)","bg": "transparent",           border: "var(--border)"          },
};

function ScoreRing({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 75 ? "var(--good)" : pct >= 55 ? "var(--accent)" : "var(--warn)";

  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={radius} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={radius} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-bold"
        style={{ color }}
      >
        {pct}%
      </span>
    </div>
  );
}

export default function MatchCard({
  score, jobTitle, companyName, location, remote,
  reasoning, strengths, gaps, cultureFit, recommendation,
}: MatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const rec = REC_STYLE[recommendation] ?? REC_STYLE.possible_match;

  return (
    <div
      className="card overflow-hidden hover:border-[rgba(212,165,116,0.3)] transition-colors"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          <ScoreRing score={score} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-serif-h text-[16px]">{jobTitle}</h3>
                <p className="font-mono text-[11.5px] text-faint mt-0.5">{companyName}</p>
              </div>
              <span
                className="shrink-0 font-mono text-[10px] uppercase tracking-wider px-2 py-1 rounded"
                style={{ color: rec.color, background: rec.bg, border: `1px solid ${rec.border}` }}
              >
                {rec.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 font-mono text-[11px] text-faint">
              {location && <span>{location}</span>}
              {location && remote && <span>·</span>}
              {remote && <span>remote</span>}
            </div>
          </div>
        </div>

        <p className="mt-3 text-[13.5px] text-dim leading-relaxed font-serif-h" style={{ fontWeight: 300 }}>
          {reasoning}
        </p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 font-mono text-[11px] text-accent hover:text-[var(--accent-dim)] transition-colors"
        >
          {expanded ? "hide details ↑" : "see why →"}
        </button>
      </div>

      {expanded && (
        <div
          className="border-t border-hair px-5 py-4 space-y-4"
          style={{ background: "var(--bg-elev-2)" }}
        >
          {strengths.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint mb-2">strengths</p>
              <ul className="space-y-1.5">
                {strengths.map((s, i) => (
                  <li key={i} className="text-[13px] text-dim flex items-start gap-2">
                    <span style={{ color: "var(--good)" }} className="mt-0.5 shrink-0">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {gaps.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint mb-2">gaps</p>
              <ul className="space-y-1.5">
                {gaps.map((g, i) => (
                  <li key={i} className="text-[13px] text-dim flex items-start gap-2">
                    <span style={{ color: "var(--warn)" }} className="mt-0.5 shrink-0">△</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cultureFit && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-faint mb-2">culture fit</p>
              <p className="text-[13px] text-dim">{cultureFit}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
