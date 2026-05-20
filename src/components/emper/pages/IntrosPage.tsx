"use client";

import * as React from "react";
import { Icon } from "../Icon";
import type { EmperIntro } from "../data";

interface IntrosPageProps {
  initialIntros: EmperIntro[];
}

type Filter = "all" | "new" | "seen";

export function IntrosPage({ initialIntros }: IntrosPageProps) {
  const [intros, setIntros] = React.useState<EmperIntro[]>(initialIntros);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [animating, setAnimating] = React.useState<{
    id: EmperIntro["id"];
    kind: "yes" | "no";
  } | null>(null);

  const visible = intros.filter((i) =>
    filter === "all" ? true : filter === "new" ? i.new : !i.new
  );

  const decide = (id: EmperIntro["id"], kind: "yes" | "no") => {
    setAnimating({ id, kind });
    setTimeout(() => {
      setIntros((prev) => prev.filter((i) => i.id !== id));
      setAnimating(null);
    }, 320);
  };

  return (
    <div className="max-w-[920px] mx-auto px-12 py-12">
      <header className="mb-8">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-serif-h text-[36px] leading-tight">Intros</h1>
            <div className="font-mono text-[11.5px] text-dim mt-2">
              warm intros · curated by your Kira · only ones that match
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-md border border-hair bg-elev/30">
            {(
              [
                ["all", "all"],
                ["new", "new"],
                ["seen", "seen"],
              ] as Array<[Filter, string]>
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1 text-[11.5px] font-mono uppercase tracking-wider rounded ${
                  filter === k
                    ? "text-accent bg-[rgba(212,165,116,0.08)]"
                    : "text-faint hover:text-dim"
                }`}
              >
                {l}
                {k === "new" && intros.some((i) => i.new) ? (
                  <span
                    className="ml-1.5 text-[9.5px]"
                    style={{ color: "var(--accent)" }}
                  >
                    ·{intros.filter((i) => i.new).length}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {visible.length === 0 && (
          <div className="card p-10 text-center">
            <div className="font-serif-h text-[20px] mb-2" style={{ fontWeight: 300 }}>
              No intros here.
            </div>
            <div className="font-mono text-[11.5px] text-faint">
              Kira is still calibrating. Check back in a few days.
            </div>
          </div>
        )}

        {visible.map((intro) => {
          const isAnimating = animating?.id === intro.id;
          return (
            <article
              key={intro.id}
              className="card overflow-hidden transition-all duration-300"
              style={
                isAnimating
                  ? {
                      opacity: 0,
                      transform:
                        animating!.kind === "yes"
                          ? "translateX(40px)"
                          : "translateX(-40px) scale(0.98)",
                    }
                  : {}
              }
            >
              <div className="p-6 flex gap-6">
                <div className="shrink-0">
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center font-serif-h text-[22px] logo-tile"
                    style={{
                      background: `linear-gradient(135deg, ${intro.logoColor}26, ${intro.logoColor}10)`,
                      border: `1px solid ${intro.logoColor}40`,
                      color: intro.logoColor,
                    }}
                  >
                    {intro.company[0]}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif-h text-[22px] leading-tight">
                      {intro.company}
                    </h2>
                    <span className="chip">{intro.stage}</span>
                    {intro.new && <span className="chip chip-accent">new</span>}
                    <span className="ml-auto font-mono text-[10.5px] text-faint">
                      {intro.sent}
                    </span>
                  </div>
                  <div className="font-mono text-[11.5px] text-dim mt-1.5">
                    <span className="text-faint">funding · </span>
                    {intro.funding}
                  </div>
                  <div className="font-mono text-[11.5px] text-dim mt-1">
                    <span className="text-faint">wants to talk · </span>
                    <span className="text-[--text]">{intro.who}</span>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Icon name="spark" size={12} className="text-accent" />
                      <span className="font-mono text-[10.5px] uppercase tracking-wider text-accent">
                        why this match
                      </span>
                    </div>
                    <ul
                      className="space-y-2 font-serif-h text-[14px] leading-relaxed"
                      style={{ fontWeight: 300 }}
                    >
                      {intro.reasons.map((r, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="font-mono text-[10.5px] text-faint mt-1.5">
                            0{i + 1}
                          </span>
                          <span className="text-[--text]">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 flex items-center gap-2">
                    <button
                      onClick={() => decide(intro.id, "yes")}
                      className="btn btn-accent"
                    >
                      <Icon name="check" size={12} />
                      Let&apos;s talk
                    </button>
                    <button onClick={() => decide(intro.id, "no")} className="btn">
                      <Icon name="x" size={12} />
                      Not for now
                    </button>
                    <button className="btn btn-ghost ml-auto">
                      <Icon name="external" size={12} />
                      <span className="font-mono text-[11px]">view dossier</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10 pt-6 border-t border-hair-soft font-mono text-[10.5px] text-faint flex items-center justify-between">
        <span>
          Kira reviewed 47 inbound requests this week. {intros.length} reached you.
        </span>
        <button className="hover:text-dim">how curation works ↗</button>
      </div>
    </div>
  );
}
