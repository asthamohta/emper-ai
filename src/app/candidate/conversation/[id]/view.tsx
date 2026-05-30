"use client";

import Link from "next/link";

type Turn = {
  turn_number: number;
  speaker: "candidate" | "role";
  content: string;
  sycophancy_score?: number | null;
};

type ConvData = {
  conversation: {
    id: string;
    agentConversationId: string;
    transcript: Turn[];
    terminationReason: string | null;
    walkedAwayBy: string | null;
    walkReason: string | null;
    turnCount: number | null;
    costUsd: string | null;
  };
  verdict: {
    matchVerdict: string;
    confidence: string | null;
    reasoning: string | null;
    evidenceFor: string[] | null;
    evidenceAgainst: string[] | null;
    unresolvedConcerns: string[] | null;
    biasFlags: string[] | null;
  } | null;
  job: { title: string; description: string | null };
  company: { name: string };
};

const VERDICT_BG: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-800 border-emerald-300",
  good: "bg-sky-100 text-sky-800 border-sky-300",
  marginal: "bg-amber-100 text-amber-900 border-amber-300",
  no_match: "bg-rose-100 text-rose-800 border-rose-300",
};

export function ConversationView({ data }: { data: ConvData }) {
  const { conversation, verdict, job, company } = data;
  const turns: Turn[] = (conversation.transcript as Turn[]) ?? [];

  return (
    <div className="min-h-screen px-6 py-8 max-w-3xl mx-auto">
      <Link
        href="/"
        className="font-mono text-[11px] text-faint hover:text-dim mb-6 inline-block"
      >
        ← back to workspace
      </Link>

      <header className="mb-6">
        <h1 className="font-serif-h text-[32px] leading-tight">
          {job.title} <span className="text-faint">·</span> {company.name}
        </h1>
        <div className="font-mono text-[11px] text-faint mt-1">
          {conversation.agentConversationId} · {conversation.turnCount ?? 0} turns
          {conversation.terminationReason ? (
            <>
              {" · termination: "}
              {conversation.terminationReason}
              {conversation.walkedAwayBy
                ? ` (walked away by ${conversation.walkedAwayBy})`
                : ""}
            </>
          ) : null}
          {conversation.costUsd ? ` · $${conversation.costUsd}` : ""}
        </div>
      </header>

      {verdict ? (
        <div className="mb-8 border border-hair rounded-md p-5 bg-elev/30">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span
              className={`inline-block uppercase font-bold px-3 py-1 rounded border text-[11px] tracking-wider ${
                VERDICT_BG[verdict.matchVerdict] ?? VERDICT_BG.marginal
              }`}
            >
              {verdict.matchVerdict.replace("_", " ")}
            </span>
            {verdict.confidence ? (
              <span className="text-[12px] text-dim">
                confidence {(Number(verdict.confidence) * 100).toFixed(0)}%
              </span>
            ) : null}
          </div>
          {verdict.reasoning ? (
            <p className="font-serif-h text-[15px] leading-relaxed text-[--text] mb-3">
              {verdict.reasoning}
            </p>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px]">
            <EvidenceList
              title="For match"
              items={verdict.evidenceFor}
              accent="text-emerald-700"
            />
            <EvidenceList
              title="Against match"
              items={verdict.evidenceAgainst}
              accent="text-rose-700"
            />
            <EvidenceList
              title="Unresolved"
              items={verdict.unresolvedConcerns}
              accent="text-amber-700"
            />
          </div>
        </div>
      ) : null}

      <h2 className="font-mono text-[10.5px] uppercase tracking-wider text-faint mb-3">
        Transcript
      </h2>
      <div className="space-y-3">
        {turns.map((t) => {
          const isCand = t.speaker === "candidate";
          return (
            <div
              key={t.turn_number}
              className={`flex ${isCand ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 border ${
                  isCand
                    ? "bg-emerald-50 border-emerald-200"
                    : "bg-indigo-50 border-indigo-200"
                }`}
              >
                <div
                  className={`flex items-center gap-2 mb-1 text-[10px] uppercase tracking-wider font-semibold ${
                    isCand ? "text-emerald-700" : "text-indigo-700"
                  }`}
                >
                  <span>Turn {t.turn_number}</span>
                  <span>{t.speaker}</span>
                  {t.sycophancy_score != null ? (
                    <span
                      className={`ml-auto px-1 py-0.5 rounded normal-case tracking-normal ${
                        t.sycophancy_score > 0.6
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      sycophancy {t.sycophancy_score.toFixed(2)}
                    </span>
                  ) : null}
                </div>
                <div className="whitespace-pre-wrap text-slate-800 text-[14px] leading-relaxed">
                  {t.content}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EvidenceList({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[] | null;
  accent: string;
}) {
  return (
    <div>
      <div
        className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${accent}`}
      >
        {title}
      </div>
      {items && items.length > 0 ? (
        <ul className="list-disc list-inside text-[12px] text-[--text-dim] space-y-1">
          {items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      ) : (
        <div className="text-[12px] text-faint italic">(none)</div>
      )}
    </div>
  );
}
