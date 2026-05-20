"use client";

import * as React from "react";
import { Sidebar, type PageKey } from "./Sidebar";
import { SelfPage } from "./pages/SelfPage";
import { IntrosPage } from "./pages/IntrosPage";
import { TrackerPage } from "./pages/TrackerPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { ChatsPage } from "./pages/ChatsPage";
import { KiraChatModal } from "./KiraChatModal";
import { Onboarding } from "./Onboarding";
import { MOCK, type EmperData, type EmperDocument, type EmperIntro } from "./data";

export interface WorkspaceInitialData {
  liveBackend: boolean;
  data: EmperData;
}

interface WorkspaceProps {
  initial: WorkspaceInitialData;
}

export function Workspace({ initial }: WorkspaceProps) {
  const [mode, setMode] = React.useState<"app" | "onboarding">("app");
  const [page, setPage] = React.useState<PageKey>("self");
  const [kiraOpen, setKiraOpen] = React.useState(false);
  const [kiraGap, setKiraGap] = React.useState(false);
  const [data, setData] = React.useState<EmperData>(initial.data);

  // For logged-in candidates: fetch documents + matches once and merge over the
  // mock placeholders so the rest of the UI keeps rendering even if a section
  // has no real data yet.
  React.useEffect(() => {
    if (!initial.liveBackend) return;
    let cancelled = false;

    (async () => {
      try {
        const [docsRes, matchesRes] = await Promise.allSettled([
          fetch("/api/candidate/documents", { cache: "no-store" }),
          fetch("/api/matches", { cache: "no-store" }),
        ]);

        const patch: Partial<EmperData> = {};

        if (docsRes.status === "fulfilled" && docsRes.value.ok) {
          const json = await docsRes.value.json();
          if (Array.isArray(json.documents) && json.documents.length > 0) {
            patch.documents = json.documents as EmperDocument[];
          }
        }

        if (matchesRes.status === "fulfilled" && matchesRes.value.ok) {
          const json = await matchesRes.value.json();
          if (Array.isArray(json.matches) && json.matches.length > 0) {
            patch.intros = matchesToIntros(json.matches);
          }
        }

        if (!cancelled && Object.keys(patch).length > 0) {
          setData((d) => ({ ...d, ...patch }));
        }
      } catch {
        // best-effort: leave mock fallback in place
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial.liveBackend]);

  const openKira = (gapMode: boolean) => {
    setKiraGap(gapMode);
    setKiraOpen(true);
  };

  const newIntros = data.intros.filter((i) => i.new).length;
  const trackerAttn = data.tracks.filter(
    (t) => t.status === "needs-you" || t.status === "stale"
  ).length;

  const userFirstName = data.user.name.split(" ")[0] || "there";
  const userInitials =
    data.user.initials ?? data.user.name.slice(0, 2).toUpperCase();

  if (mode === "onboarding") {
    return (
      <Onboarding
        onExit={() => setMode("app")}
        liveBackend={initial.liveBackend}
        userFirstName={userFirstName}
      />
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        page={page}
        setPage={setPage}
        introsBadge={newIntros}
        trackerBadge={trackerAttn}
        onEnterOnboarding={() => setMode("onboarding")}
        user={data.user}
      />
      <main className="flex-1 min-w-0">
        {page === "self" && (
          <SelfPage data={data} onTalkToKira={() => openKira(true)} />
        )}
        {page === "intros" && <IntrosPage initialIntros={data.intros} />}
        {page === "tracker" && (
          <TrackerPage
            tracks={data.tracks}
            discoveries={data.discoveries}
            email={data.email}
          />
        )}
        {page === "documents" && <DocumentsPage documents={data.documents} />}
        {page === "chats" && (
          <ChatsPage
            chats={data.chats}
            user={data.user}
            onStartNewChat={() => openKira(false)}
          />
        )}
      </main>

      <KiraChatModal
        open={kiraOpen}
        onClose={() => setKiraOpen(false)}
        gapMode={kiraGap}
        liveBackend={initial.liveBackend}
        userInitials={userInitials}
        userFirstName={userFirstName}
      />
    </div>
  );
}

type MatchRow = {
  match: {
    score: number;
    reasoning: string;
    matchDetails?: {
      strengths?: string[];
      gaps?: string[];
      cultureFit?: string;
      recommendation?: string;
    } | null;
    createdAt?: string;
  };
  job: { title: string; location?: string; remote?: boolean };
  company: { name: string };
};

const LOGO_COLORS = ["#7cffb2", "#d4a574", "#a78bfa", "#fb923c", "#7cc1ff", "#fde68a"];

function matchesToIntros(rows: MatchRow[]): EmperIntro[] {
  return rows.map((r, idx) => {
    const m = r.match;
    const details = m.matchDetails ?? {};
    const reasons: string[] = [];
    if (m.reasoning) reasons.push(m.reasoning);
    if (details.strengths) reasons.push(...details.strengths.slice(0, 2));
    if (details.cultureFit) reasons.push(details.cultureFit);
    if (reasons.length === 0) reasons.push("Strong vector + LLM match on your profile.");

    const sent = m.createdAt
      ? relativeTime(new Date(m.createdAt))
      : "just now";

    return {
      id: idx + 1,
      company: r.company.name || "Unknown company",
      stage: details.recommendation
        ? details.recommendation.replace("_", " ")
        : `score ${Math.round((m.score ?? 0) * 100)}%`,
      funding: r.job.remote ? "Remote-friendly" : r.job.location || "—",
      who: r.job.title,
      whoTitle: "role",
      reasons: reasons.slice(0, 4),
      sent,
      logoColor: LOGO_COLORS[idx % LOGO_COLORS.length],
      new: idx < 2,
    };
  });
}

function relativeTime(d: Date) {
  const ms = Date.now() - d.getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  return `${Math.floor(days / 7)} weeks ago`;
}
