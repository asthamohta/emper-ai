"use client";

import * as React from "react";
import { Icon } from "./Icon";

export function Attribution({ sources }: { sources: string[] }) {
  if (!sources?.length) return null;
  return (
    <div className="font-mono text-[10.5px] text-faint mt-3 flex flex-wrap gap-x-1.5 gap-y-1 items-center">
      <span>based on</span>
      {sources.map((s, i) => (
        <React.Fragment key={i}>
          <span className="px-1.5 py-px border border-hair rounded-[3px] text-dim hover:text-accent hover:border-[rgba(212,165,116,0.4)] cursor-default transition-colors">
            {s}
          </span>
          {i < sources.length - 1 && <span className="text-faint">+</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export function SectionHead({ label, mono }: { label: string; mono: string }) {
  return (
    <div className="flex items-end gap-3 mb-4">
      <h2 className="font-serif-h text-[28px] leading-none whitespace-nowrap">{label}</h2>
      <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider pb-1">
        {mono}
      </div>
    </div>
  );
}

export function KiraBanner({
  count,
  onTalk,
}: {
  count: number;
  onTalk: () => void;
}) {
  return (
    <div
      className="card flex items-center gap-4 p-4 mb-8"
      style={{
        borderColor: "rgba(212,165,116,0.25)",
        background:
          "linear-gradient(180deg, rgba(212,165,116,0.05), rgba(212,165,116,0.02))",
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{
          background: "rgba(212,165,116,0.12)",
          border: "1px solid rgba(212,165,116,0.3)",
        }}
      >
        <Icon name="spark" size={16} className="text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px]">
          Kira wants to understand{" "}
          <span className="text-accent">{count} more things</span> about you.
        </div>
        <div className="font-mono text-[11px] text-faint mt-1">
          last conversation · 14 days ago
        </div>
      </div>
      <button onClick={onTalk} className="btn btn-accent">
        Talk to Kira
        <Icon name="arrow-right" size={12} />
      </button>
    </div>
  );
}
