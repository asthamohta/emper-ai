"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { ChatHistoryPasteModal } from "../ChatHistoryPasteModal";
import { FetchWorkingStyleModal } from "../FetchWorkingStyleModal";
import { Attribution, KiraBanner, SectionHead } from "../primitives";
import type { EmperData } from "../data";

interface SelfPageProps {
  data: EmperData;
  onTalkToKira: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function SelfPage({ data, onTalkToKira, onRefresh, refreshing }: SelfPageProps) {
  const [isPublic, setIsPublic] = React.useState(data.user.publicProfile);
  const [chatHistoryOpen, setChatHistoryOpen] = React.useState(false);
  const [fetchWorkingStyleOpen, setFetchWorkingStyleOpen] = React.useState(false);
  const [rebuilding, setRebuilding] = React.useState(false);
  const [rebuildStatus, setRebuildStatus] = React.useState<string | null>(null);

  async function triggerRebuild() {
    setRebuilding(true);
    setRebuildStatus("rebuilding profile…");
    try {
      await fetch("/api/candidate/rebuild", { method: "POST" });
      // Poll for completion — rebuild takes ~30-60s (batch API)
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        await onRefresh?.();
        if (attempts >= 24) { // 2 min max
          clearInterval(poll);
          setRebuilding(false);
          setRebuildStatus("done · reload if profile still empty");
        }
      }, 5000);
      setTimeout(() => {
        clearInterval(poll);
        setRebuilding(false);
        setRebuildStatus("done · reload if profile still empty");
      }, 120_000);
    } catch {
      setRebuilding(false);
      setRebuildStatus("rebuild failed — check uvicorn is running");
    }
  }

  return (
    <div className="max-w-[760px] mx-auto px-12 py-12">
      <header className="mb-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="font-serif-h text-[44px] leading-tight tracking-tight">
              {data.user.name}
            </h1>
            <div className="font-mono text-[12px] text-dim mt-2 flex items-center gap-2 flex-wrap">
              <span>{data.user.role}</span>
              <span className="text-faint">·</span>
              <span>{data.user.company}</span>
              <span className="text-faint">·</span>
              <span>{data.user.location}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setFetchWorkingStyleOpen(true)}
              className="btn btn-accent"
            >
              <Icon name="spark" size={12} />
              <span className="font-mono text-[11px] uppercase tracking-wider">fetch working style</span>
            </button>
            <button
              onClick={() => setChatHistoryOpen(true)}
              className="btn"
            >
              <Icon name="spark" size={12} />
              <span className="font-mono text-[11px] uppercase tracking-wider">add chat history</span>
            </button>
            <a
              href="/api/candidate/export"
              download
              className="btn"
            >
              <Icon name="doc" size={12} />
              <span className="font-mono text-[11px] uppercase tracking-wider">download .md</span>
            </a>
            <button
              onClick={triggerRebuild}
              disabled={rebuilding}
              className="btn"
              title="Rebuild profile from all documents"
            >
              <Icon name="refresh" size={12} className={rebuilding ? "animate-spin" : ""} />
              <span className="font-mono text-[11px] uppercase tracking-wider">
                {rebuilding ? "rebuilding…" : "rebuild profile"}
              </span>
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="btn"
                title="Refresh profile from database"
              >
                <Icon name="refresh" size={12} className={refreshing ? "animate-spin" : ""} />
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  {refreshing ? "refreshing…" : "refresh"}
                </span>
              </button>
            )}
            {rebuildStatus && (
              <span className="font-mono text-[10px] text-faint">{rebuildStatus}</span>
            )}
            <button
              onClick={() => setIsPublic((p) => !p)}
              className="btn"
              style={isPublic ? {} : { color: "var(--text-dim)" }}
            >
              <Icon name={isPublic ? "eye" : "lock"} size={12} />
              <span className="font-mono text-[11px] uppercase tracking-wider">
                {isPublic ? "public" : "private"}
              </span>
            </button>
          </div>
        </div>
      </header>

      <KiraBanner count={data.gapQuestions} onTalk={onTalkToKira} />

      {data.arc.body ? (
        <section className="mb-14">
          <SectionHead label="The arc" mono="career trajectory" />
          <div
            className="prose-warm text-[15.5px] leading-relaxed font-serif-h text-[--text]"
            style={{ fontWeight: 300 }}
          >
            <p>{data.arc.body}</p>
          </div>
          <Attribution sources={data.arc.sources} />
        </section>
      ) : null}

      {data.howIWork.body ? (
        <section className="mb-14">
          <SectionHead label="How I work" mono="technical identity" />
          <div
            className="prose-warm text-[15.5px] leading-relaxed font-serif-h"
            style={{ fontWeight: 300 }}
          >
            <p>{data.howIWork.body}</p>
          </div>
          <Attribution sources={data.howIWork.sources} />
        </section>
      ) : null}

      {data.behavioralProfile ? (
        <section className="mb-14">
          <SectionHead label="Behavioral signals" mono="from Claude chat history" />
          <div
            className="prose-warm text-[15.5px] leading-relaxed font-serif-h"
            style={{ fontWeight: 300 }}
          >
            {data.behavioralProfile.body.split("\n\n").map((para, i) => (
              <p key={i} className={i > 0 ? "mt-4" : ""}>{para}</p>
            ))}
          </div>
          <Attribution sources={data.behavioralProfile.sources} />
        </section>
      ) : null}

      {data.shipped.length > 0 ? (
        <section className="mb-14">
          <SectionHead label="Shipped" mono="projects · owned" />
          <div className="space-y-5">
            {data.shipped.map((p, i) => (
              <div
                key={i}
                className="border-l border-hair pl-5 py-1 hover:border-[rgba(212,165,116,0.5)] transition-colors"
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <h3 className="font-serif-h text-[18px]">{p.title}</h3>
                  {p.where && (
                    <span className="font-mono text-[10.5px] text-faint uppercase tracking-wider">
                      {p.where}
                    </span>
                  )}
                </div>
                {p.blurb && (
                  <p className="text-[14px] text-dim mt-1.5 leading-relaxed">{p.blurb}</p>
                )}
              </div>
            ))}
          </div>
          <Attribution sources={data.shippedSources} />
        </section>
      ) : null}

      {data.optimizingFor.body ? (
        <section className="mb-14">
          <SectionHead label="What I'm optimizing for" mono="current intent" />
          <div
            className="prose-warm text-[15.5px] leading-relaxed font-serif-h"
            style={{ fontWeight: 300 }}
          >
            <p>{data.optimizingFor.body}</p>
          </div>
          <Attribution sources={data.optimizingFor.sources} />
        </section>
      ) : null}

      <div className="pt-8 border-t border-hair-soft flex items-center justify-between font-mono text-[10.5px] text-faint">
        <span>profile · v0.42 · auto-rebuilt 14d ago</span>
        <span>
          shareable at emper.ai/{data.user.name.toLowerCase().replace(/\s+/g, "-")}
        </span>
      </div>

      <ChatHistoryPasteModal
        open={chatHistoryOpen}
        onClose={() => setChatHistoryOpen(false)}
      />
      <FetchWorkingStyleModal
        open={fetchWorkingStyleOpen}
        onClose={() => setFetchWorkingStyleOpen(false)}
      />
    </div>
  );
}
