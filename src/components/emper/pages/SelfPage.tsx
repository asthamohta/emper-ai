"use client";

import * as React from "react";
import { Icon } from "../Icon";
import { ChatHistoryPasteModal } from "../ChatHistoryPasteModal";
import { Attribution, KiraBanner, SectionHead } from "../primitives";
import type { EmperData } from "../data";

interface SelfPageProps {
  data: EmperData;
  onTalkToKira: () => void;
}

export function SelfPage({ data, onTalkToKira }: SelfPageProps) {
  const [isPublic, setIsPublic] = React.useState(data.user.publicProfile);
  const [chatHistoryOpen, setChatHistoryOpen] = React.useState(false);

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
    </div>
  );
}
