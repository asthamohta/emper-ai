"use client";

import * as React from "react";
import { Icon } from "../Icon";
import type { EmperChat, EmperUser } from "../data";

interface ChatsPageProps {
  chats: EmperChat[];
  user: EmperUser;
  onStartNewChat: () => void;
}

export function ChatsPage({ chats, user, onStartNewChat }: ChatsPageProps) {
  const [selectedId, setSelectedId] = React.useState<number | null>(null);

  const totalMinutes = chats.reduce(
    (s, c) => s + parseInt(c.duration, 10) || 0,
    0
  );

  if (selectedId !== null) {
    const chat = chats.find((c) => c.id === selectedId);
    if (!chat) return null;
    return (
      <div className="max-w-[760px] mx-auto px-12 py-12">
        <button
          onClick={() => setSelectedId(null)}
          className="btn btn-ghost mb-6 -ml-3"
        >
          <Icon name="back" size={12} />
          all chats
        </button>
        <div className="mb-8">
          <h1 className="font-serif-h text-[30px] leading-tight">{chat.title}</h1>
          <div className="font-mono text-[11px] text-dim mt-2">
            {chat.date} · {chat.duration} · chat
          </div>
        </div>

        <div className="space-y-5">
          {chat.transcript.map((m, i) => (
            <div key={i} className="flex gap-4">
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-mono text-[10px]"
                style={
                  m.from === "kira"
                    ? {
                        background: "rgba(212,165,116,0.12)",
                        border: "1px solid rgba(212,165,116,0.3)",
                        color: "var(--accent)",
                      }
                    : { background: "#1f1f1f", color: "var(--text-dim)" }
                }
              >
                {m.from === "kira"
                  ? "K"
                  : user.initials ?? user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10.5px] text-faint mb-1.5 uppercase tracking-wider">
                  {m.from === "kira" ? "Kira" : user.name.split(" ")[0]}
                </div>
                <div
                  className="font-serif-h text-[15.5px] leading-relaxed text-[--text]"
                  style={{ fontWeight: 300 }}
                >
                  {m.text}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-hair-soft font-mono text-[10.5px] text-faint">
          this transcript is private. Kira used it to update your Self profile.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[760px] mx-auto px-12 py-12">
      <header className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-serif-h text-[36px] leading-tight">
            Chats with Kira
          </h1>
          <div className="font-mono text-[11.5px] text-dim mt-2">
            {chats.length} conversations · {totalMinutes} min total
          </div>
        </div>
        <button onClick={onStartNewChat} className="btn btn-accent">
          <Icon name="plus" size={12} />
          Start a new chat
          <span className="opacity-50 ml-1 pl-2 border-l border-[rgba(212,165,116,0.3)] flex items-center gap-1">
            <Icon name="mic" size={11} />
          </span>
        </button>
      </header>

      <div className="space-y-2">
        {chats.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className="w-full text-left card p-5 hover:border-[#2a2a2a] transition-colors group"
          >
            <div className="flex items-start gap-5">
              <div className="font-mono text-[10.5px] text-faint pt-1 shrink-0 w-[88px]">
                <div>{c.date.split(",")[0]}</div>
                <div className="text-[--text-dim] mt-0.5">{c.duration}</div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif-h text-[19px] leading-snug group-hover:text-accent transition-colors">
                  {c.title}
                </h3>
                <p className="text-[13.5px] text-dim mt-2 leading-relaxed">
                  {c.summary}
                </p>
              </div>
              <Icon
                name="chevron-right"
                size={14}
                className="text-faint mt-2 shrink-0"
              />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-hair-soft font-mono text-[10.5px] text-faint flex items-center justify-between">
        <span>Kira learns from every chat. Your profile rebuilds after each.</span>
        <button className="hover:text-dim">what Kira remembers ↗</button>
      </div>
    </div>
  );
}
