"use client";

import * as React from "react";
import { Icon } from "../Icon";
import type {
  EmperDiscovery,
  EmperEmail,
  EmperTrack,
} from "../data";

interface TrackerPageProps {
  tracks: EmperTrack[];
  discoveries: EmperDiscovery[];
  email: EmperEmail;
}

type Selected =
  | { kind: "track"; data: EmperTrack }
  | { kind: "discovery"; data: EmperDiscovery };

export function TrackerPage({ tracks, discoveries, email }: TrackerPageProps) {
  const [selected, setSelected] = React.useState<Selected | null>(null);
  const [emailModalOpen, setEmailModalOpen] = React.useState(false);

  if (selected) {
    return (
      <TrackDetail
        selected={selected}
        email={email}
        onBack={() => setSelected(null)}
      />
    );
  }

  const needsYou = tracks.filter(
    (t) => t.status === "needs-you" || t.status === "stale"
  );
  const inMotion = tracks.filter(
    (t) => t.status === "scheduled" || t.status === "their-court"
  );

  return (
    <div className="max-w-[920px] mx-auto px-12 py-12">
      <header className="mb-6">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-serif-h text-[36px] leading-tight">Tracker</h1>
            <div className="font-mono text-[11.5px] text-dim mt-2">
              every conversation Kira is following · across intros, inbound, your
              inbox
            </div>
          </div>
          <button onClick={() => setEmailModalOpen(true)} className="btn">
            <Icon name="settings" size={12} />
            <span className="font-mono text-[11px]">manage connection</span>
          </button>
        </div>
      </header>

      <div
        className="card p-3.5 mb-8 flex items-center gap-4"
        style={{
          borderColor: "rgba(124,255,178,0.18)",
          background:
            "linear-gradient(180deg, rgba(124,255,178,0.025), transparent)",
        }}
      >
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{
            background: "rgba(124,255,178,0.08)",
            border: "1px solid rgba(124,255,178,0.25)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7cffb2"
            strokeWidth="1.5"
          >
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <path d="M3 8l9 6 9-6" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
            <span className="text-[13px] shrink-0">{email.provider}</span>
            <span className="font-mono text-[12px] text-dim truncate">
              {email.address}
            </span>
            <span
              className="chip shrink-0"
              style={{ color: "#7cffb2", borderColor: "rgba(124,255,178,0.3)" }}
            >
              <span
                className="w-1 h-1 rounded-full"
                style={{ background: "#7cffb2" }}
              />
              connected
            </span>
          </div>
          <div className="font-mono text-[10.5px] text-faint mt-1 truncate">
            last sync {email.lastSync} ·{" "}
            {email.threadsScanned.toLocaleString()} threads scanned ·{" "}
            {email.threadsRelevant} flagged as relevant
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-[10px] text-faint uppercase tracking-wider">
            access
          </div>
          <div className="font-mono text-[10.5px] text-dim mt-0.5">
            read-only · job-keywords only
          </div>
        </div>
      </div>

      {needsYou.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end gap-3 mb-3">
            <h2 className="font-serif-h text-[22px] leading-none whitespace-nowrap">
              Needs you
            </h2>
            <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider pb-1">
              ball in your court
            </div>
            <span className="ml-auto font-mono text-[10.5px] text-faint">
              {needsYou.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {needsYou.map((t) => (
              <TrackRow
                key={t.id}
                t={t}
                accent
                onClick={() => setSelected({ kind: "track", data: t })}
              />
            ))}
          </div>
        </section>
      )}

      {inMotion.length > 0 && (
        <section className="mb-10">
          <div className="flex items-end gap-3 mb-3">
            <h2 className="font-serif-h text-[22px] leading-none whitespace-nowrap">
              In motion
            </h2>
            <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider pb-1">
              Kira is watching · no action needed
            </div>
            <span className="ml-auto font-mono text-[10.5px] text-faint">
              {inMotion.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {inMotion.map((t) => (
              <TrackRow
                key={t.id}
                t={t}
                onClick={() => setSelected({ kind: "track", data: t })}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <div className="flex items-end gap-3 mb-3">
          <h2 className="font-serif-h text-[22px] leading-none whitespace-nowrap">
            Found in your inbox
          </h2>
          <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider pb-1">
            conversations Kira surfaced · not from her intros
          </div>
          <span className="ml-auto font-mono text-[10.5px] text-faint">
            {discoveries.length}
          </span>
        </div>
        <div className="space-y-2.5">
          {discoveries.map((d) => (
            <DiscoveryRow
              key={d.id}
              d={d}
              onClick={() => setSelected({ kind: "discovery", data: d })}
            />
          ))}
        </div>
      </section>

      <div className="mt-12 pt-6 border-t border-hair-soft font-mono text-[10.5px] text-faint flex items-center justify-between">
        <span>
          Kira watches threads matching: recruiter language, founder outreach,
          scheduling, and any company in your active intro set.
        </span>
        <button className="hover:text-dim">what Kira reads ↗</button>
      </div>

      {emailModalOpen && (
        <EmailManageModal email={email} onClose={() => setEmailModalOpen(false)} />
      )}
    </div>
  );
}

const TRACK_STATUS: Record<
  EmperTrack["status"],
  { label: string; color: string }
> = {
  "needs-you": { label: "needs reply", color: "#fbbf24" },
  stale: { label: "stale · 9 days", color: "#fbbf24" },
  scheduled: { label: "scheduled", color: "#7cffb2" },
  "their-court": { label: "awaiting them", color: "#8a8a85" },
};

function TrackRow({
  t,
  onClick,
  accent,
}: {
  t: EmperTrack;
  onClick: () => void;
  accent?: boolean;
}) {
  const statusCfg = TRACK_STATUS[t.status];

  return (
    <button
      onClick={onClick}
      className="w-full text-left card p-4 hover:border-[#2a2a2a] transition-colors flex items-stretch gap-4"
      style={
        accent
          ? {
              borderColor: "rgba(251,191,36,0.18)",
              background:
                "linear-gradient(180deg, rgba(251,191,36,0.025), transparent)",
            }
          : {}
      }
    >
      <div className="shrink-0">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center font-serif-h text-[17px] logo-tile"
          style={{
            background: `linear-gradient(135deg, ${t.logoColor}26, ${t.logoColor}10)`,
            border: `1px solid ${t.logoColor}40`,
            color: t.logoColor,
          }}
        >
          {t.company[0]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif-h text-[17px] leading-none">{t.company}</span>
          <span className="font-mono text-[10.5px] text-faint">·</span>
          <span className="font-mono text-[11.5px] text-dim">
            {t.person} <span className="text-faint">/ {t.personRole}</span>
          </span>
        </div>
        <div className="text-[13px] text-dim mt-1.5 leading-snug line-clamp-1">
          <span className="text-accent">Kira:</span> {t.kira.split(". ")[0]}.
        </div>
        <div className="font-mono text-[10.5px] text-faint mt-1.5 flex items-center gap-2 flex-wrap">
          <span>{t.lastEvent}</span>
          <span>·</span>
          <span>
            {t.threadCount} {t.threadCount === 1 ? "message" : "messages"}
          </span>
          <span>·</span>
          <span>via {t.source}</span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end justify-between gap-2">
        <span
          className="chip whitespace-nowrap"
          style={{ color: statusCfg.color, borderColor: `${statusCfg.color}40` }}
        >
          <span
            className="w-1 h-1 rounded-full"
            style={{ background: statusCfg.color }}
          />
          {statusCfg.label}
        </span>
        <Icon name="chevron-right" size={14} className="text-faint" />
      </div>
    </button>
  );
}

const VERDICT: Record<
  EmperDiscovery["kiraVerdict"],
  { label: string; color: string }
> = {
  match: { label: "looks like a match", color: "#7cffb2" },
  "off-criteria": { label: "off-criteria · personal", color: "#a78bfa" },
  noise: { label: "probably noise", color: "#5a5a55" },
};

function DiscoveryRow({
  d,
  onClick,
}: {
  d: EmperDiscovery;
  onClick: () => void;
}) {
  const cfg = VERDICT[d.kiraVerdict];

  return (
    <button
      onClick={onClick}
      className="w-full text-left card p-4 hover:border-[#2a2a2a] transition-colors flex items-stretch gap-4"
    >
      <div className="shrink-0">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center font-serif-h text-[17px] logo-tile"
          style={{
            background: `linear-gradient(135deg, ${d.logoColor}26, ${d.logoColor}10)`,
            border: `1px solid ${d.logoColor}40`,
            color: d.logoColor,
          }}
        >
          {d.company[0]}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-serif-h text-[17px] leading-none">{d.company}</span>
          <span className="font-mono text-[10.5px] text-faint">·</span>
          <span className="font-mono text-[11.5px] text-dim">
            {d.person} <span className="text-faint">/ {d.personRole}</span>
          </span>
        </div>
        <div
          className="text-[13px] text-dim mt-1.5 leading-snug line-clamp-2 italic"
          style={{ fontFamily: "'Newsreader',serif", fontWeight: 300 }}
        >
          &ldquo;{d.snippet}&rdquo;
        </div>
        <div className="font-mono text-[10.5px] text-faint mt-1.5">
          arrived {d.arrived} · Kira saw this in your inbox
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end justify-between gap-2">
        <span
          className="chip whitespace-nowrap"
          style={{ color: cfg.color, borderColor: `${cfg.color}40` }}
        >
          {cfg.label}
        </span>
        <Icon name="chevron-right" size={14} className="text-faint" />
      </div>
    </button>
  );
}

function TrackDetail({
  selected,
  email,
  onBack,
}: {
  selected: Selected;
  email: EmperEmail;
  onBack: () => void;
}) {
  const isDiscovery = selected.kind === "discovery";
  const t = selected.data;
  const logoColor = t.logoColor;

  return (
    <div className="max-w-[760px] mx-auto px-12 py-12">
      <button onClick={onBack} className="btn btn-ghost mb-6 -ml-3">
        <Icon name="back" size={12} />
        tracker
      </button>

      <div className="flex items-start gap-5 mb-8">
        <div
          className="w-14 h-14 rounded-lg flex items-center justify-center font-serif-h text-[22px] logo-tile shrink-0"
          style={{
            background: `linear-gradient(135deg, ${logoColor}26, ${logoColor}10)`,
            border: `1px solid ${logoColor}40`,
            color: logoColor,
          }}
        >
          {t.company[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif-h text-[30px] leading-tight">{t.company}</h1>
          <div className="font-mono text-[11.5px] text-dim mt-1">
            with {t.person} · {t.personRole}
          </div>
          {selected.kind === "track" && (
            <div className="font-mono text-[10.5px] text-faint mt-2">
              {selected.data.threadCount} messages · last activity{" "}
              {selected.data.lastEvent.toLowerCase()}
            </div>
          )}
          {selected.kind === "discovery" && (
            <div className="font-mono text-[10.5px] text-faint mt-2">
              cold inbound · arrived {selected.data.arrived}
            </div>
          )}
        </div>
      </div>

      <div
        className="card p-5 mb-8"
        style={{
          borderColor: "rgba(212,165,116,0.25)",
          background:
            "linear-gradient(180deg, rgba(212,165,116,0.04), rgba(212,165,116,0.01))",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: "rgba(212,165,116,0.12)",
              border: "1px solid rgba(212,165,116,0.3)",
            }}
          >
            <Icon name="spark" size={13} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[10.5px] uppercase tracking-wider text-accent mb-1.5">
              Kira&apos;s read
            </div>
            <p
              className="font-serif-h text-[15px] leading-relaxed"
              style={{ fontWeight: 300 }}
            >
              {t.kira}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className="btn btn-accent">
                <Icon name="spark" size={12} />
                Draft a reply
              </button>
              <button className="btn">
                <Icon name="chat" size={12} />
                Ask Kira about this
              </button>
              {selected.kind === "track" && selected.data.status === "stale" && (
                <button className="btn">
                  <Icon name="send" size={12} />
                  Send soft nudge
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-end gap-3 mb-3">
          <h2 className="font-serif-h text-[20px] leading-none whitespace-nowrap">
            {isDiscovery ? "Their message" : "Recent thread"}
          </h2>
          <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider pb-1">
            from your {email.provider.toLowerCase()}
          </div>
        </div>
        <div className="card" style={{ borderColor: "var(--border)" }}>
          {(selected.kind === "discovery"
            ? [
                {
                  from: selected.data.person,
                  at: selected.data.arrived,
                  text: selected.data.snippet,
                },
              ]
            : selected.data.preview
          ).map((m, i) => (
            <div
              key={i}
              className={`p-4 ${i > 0 ? "border-t border-hair-soft" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[11px] text-dim">{m.from}</span>
                <span className="font-mono text-[10.5px] text-faint">·</span>
                <span className="font-mono text-[10.5px] text-faint">{m.at}</span>
              </div>
              <div
                className="text-[13.5px] leading-relaxed text-[--text]"
                style={{ fontFamily: "'Newsreader',serif", fontWeight: 300 }}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[10.5px] text-faint flex items-center gap-2">
          <Icon name="lock" size={10} />
          Kira reads thread metadata + first 200 chars. Full body fetched only when
          you open it.
        </div>
      </div>
    </div>
  );
}

function EmailManageModal({
  email,
  onClose,
}: {
  email: EmperEmail;
  onClose: () => void;
}) {
  const opts = [
    {
      on: true,
      t: "Watch threads with active intros",
      d: "Reads metadata + content of conversations Kira started",
    },
    {
      on: true,
      t: "Scan inbound for matches",
      d: "Senders + first 200 chars, filtered to recruiter / founder language",
    },
    {
      on: true,
      t: "Detect scheduling + status changes",
      d: "Calendar invites, replies, no-replies past 5 days",
    },
    {
      on: false,
      t: "Draft replies",
      d: "Currently manual — toggle on to let Kira pre-draft in your voice",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="card w-full max-w-[520px] overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-hair">
          <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider flex-1">
            manage email connection
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{
                background: "rgba(124,255,178,0.08)",
                border: "1px solid rgba(124,255,178,0.25)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#7cffb2"
                strokeWidth="1.5"
              >
                <rect x="3" y="6" width="18" height="14" rx="2" />
                <path d="M3 8l9 6 9-6" />
              </svg>
            </div>
            <div>
              <div className="text-[14px]">{email.address}</div>
              <div className="font-mono text-[10.5px] text-dim">
                {email.provider} · OAuth · expires Aug 2026
              </div>
            </div>
          </div>

          <div className="font-mono text-[10.5px] uppercase tracking-wider text-faint mb-2.5">
            what Kira does with your inbox
          </div>
          <div className="space-y-2 mb-6">
            {opts.map((opt, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-md border border-hair"
              >
                <div
                  className="w-8 h-4 rounded-full mt-0.5 relative shrink-0"
                  style={{
                    background: opt.on ? "rgba(212,165,116,0.6)" : "#1f1f1f",
                  }}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                    style={{
                      left: opt.on ? "calc(100% - 14px)" : "2px",
                      background: opt.on ? "var(--bg)" : "#444",
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px]">{opt.t}</div>
                  <div className="text-[11.5px] text-dim mt-0.5">{opt.d}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-hair-soft">
            <button className="font-mono text-[11px] text-faint hover:text-dim">
              disconnect ↗
            </button>
            <button onClick={onClose} className="btn btn-accent">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
