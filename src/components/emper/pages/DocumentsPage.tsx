"use client";

import * as React from "react";
import { Icon, type IconName } from "../Icon";
import type { EmperDocument } from "../data";

interface DocumentsPageProps {
  documents: EmperDocument[];
}

const TYPE_COLOR: Record<EmperDocument["type"], string> = {
  resume: "#d4a574",
  linkedin: "#7cc1ff",
  sop: "#a78bfa",
  blog: "#fb923c",
  github: "#7cffb2",
  other: "#8a8a85",
};

const TYPE_ICON: Record<EmperDocument["type"], IconName> = {
  resume: "doc",
  linkedin: "user",
  sop: "doc",
  blog: "doc",
  github: "github",
  other: "doc",
};

export function DocumentsPage({ documents }: DocumentsPageProps) {
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const totalAttrs = documents.reduce((s, d) => s + d.attrs, 0);

  return (
    <div className="max-w-[920px] mx-auto px-12 py-12">
      <header className="mb-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-serif-h text-[36px] leading-tight">Documents</h1>
            <div className="font-mono text-[11.5px] text-dim mt-2">
              {documents.length} sources · {totalAttrs} attributes extracted
            </div>
          </div>
          <button className="btn btn-accent">
            <Icon name="plus" size={12} />
            Add more documents
          </button>
        </div>
      </header>

      <div className="flex items-start gap-3 p-3.5 mb-6 rounded-md border border-hair bg-elev/40">
        <Icon name="lock" size={13} className="text-accent mt-0.5 shrink-0" />
        <div className="text-[12.5px] text-dim leading-relaxed">
          These stay private. Only the{" "}
          <span className="font-mono text-[--text]">attributes Kira extracts</span> —
          not the raw documents — inform your profile or get surfaced to companies.
        </div>
      </div>

      <div className="card" style={{ borderColor: "var(--border)" }}>
        {documents.map((d, i) => {
          const open = expanded === i;
          const color = TYPE_COLOR[d.type];
          return (
            <div
              key={i}
              className={i > 0 ? "border-t border-hair-soft" : ""}
            >
              <button
                onClick={() => setExpanded(open ? null : i)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#0e0e0e] transition-colors"
              >
                <div
                  className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                  style={{
                    background: `${color}12`,
                    border: `1px solid ${color}30`,
                    color,
                  }}
                >
                  <Icon name={TYPE_ICON[d.type]} size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[13.5px] font-mono truncate">{d.name}</span>
                    <span
                      className="chip"
                      style={{ color, borderColor: `${color}40` }}
                    >
                      {d.type}
                    </span>
                  </div>
                  <div className="font-mono text-[10.5px] text-faint mt-1">
                    {d.date} · {d.size}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="font-serif-h text-[20px] text-accent"
                    style={{ fontWeight: 300 }}
                  >
                    {d.attrs}
                  </div>
                  <div className="font-mono text-[10px] text-faint uppercase tracking-wider mt-0.5">
                    attributes
                  </div>
                </div>
                <Icon
                  name={open ? "chevron-down" : "chevron-right"}
                  size={14}
                  className="text-faint shrink-0 ml-1"
                />
              </button>

              {open && (
                <div className="px-5 pb-5 pt-1 bg-[#080808]">
                  <div className="pl-12">
                    <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider mb-2">
                      Kira extracted
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {d.attrList.map((a, j) => (
                        <span key={j} className="chip">
                          {a}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-3 font-mono text-[10.5px] text-faint">
                      <button className="hover:text-dim">view full extraction →</button>
                      <span className="text-faint">·</span>
                      <button className="hover:text-dim">re-process</button>
                      <span className="text-faint">·</span>
                      <button className="hover:text-dim">remove</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-hair-soft font-mono text-[10.5px] text-faint flex items-center justify-between">
        <span>last extraction · 14 days ago</span>
        <span>raw documents · client-side encrypted</span>
      </div>
    </div>
  );
}
