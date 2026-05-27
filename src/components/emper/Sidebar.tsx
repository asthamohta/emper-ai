"use client";

import { useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";
import type { EmperUser } from "./data";

export type PageKey = "self" | "intros" | "tracker" | "documents" | "chats";

interface SidebarProps {
  page: PageKey;
  setPage: (p: PageKey) => void;
  introsBadge: number;
  trackerBadge: number;
  onEnterOnboarding: () => void;
  user: EmperUser;
}

type Item = {
  key: PageKey;
  label: string;
  icon: IconName;
  badge?: number;
  badgeKind?: "default" | "attn";
};

export function Sidebar({
  page,
  setPage,
  introsBadge,
  trackerBadge,
  onEnterOnboarding,
  user,
}: SidebarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }
  const items: Item[] = [
    { key: "self", label: "Self", icon: "user" },
    { key: "intros", label: "Intros", icon: "inbox", badge: introsBadge },
    {
      key: "tracker",
      label: "Tracker",
      icon: "track",
      badge: trackerBadge,
      badgeKind: "attn",
    },
    { key: "documents", label: "Documents", icon: "doc" },
    { key: "chats", label: "Chats with Kira", icon: "chat" },
  ];

  return (
    <aside className="bg-sidebar w-[240px] shrink-0 border-r border-hair flex flex-col h-screen sticky top-0">
      {/* brand */}
      <div className="px-5 pt-5 pb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-[5px] flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#d4a574,#8a6a47)" }}
          >
            <div className="w-1.5 h-1.5 rounded-[2px] bg-black/70" />
          </div>
          <span className="font-serif-h text-[17px] leading-none">emper</span>
          <span className="font-mono text-[10px] text-faint mt-1">/ai</span>
        </div>
        <div className="mt-5 flex items-center gap-2 px-2 py-1.5 rounded-md border border-hair bg-elev/40 text-[11px] font-mono text-dim">
          <Icon name="command" size={12} />
          <span className="flex-1">search</span>
          <span className="kbd">⌘K</span>
        </div>
      </div>

      <nav className="px-2 flex-1 overflow-auto">
        <div className="px-3 mb-1 font-mono text-[10px] text-faint uppercase tracking-wider">
          workspace
        </div>
        {items.map((it) => {
          const active = page === it.key;
          return (
            <button
              key={it.key}
              onClick={() => setPage(it.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13.5px] transition-colors ${
                active
                  ? "text-accent bg-[rgba(212,165,116,0.06)]"
                  : "text-dim hover:bg-[#0d0d0d]"
              }`}
            >
              <Icon name={it.icon} size={15} />
              <span className="flex-1 text-left">{it.label}</span>
              {it.badge ? (
                <span
                  className="text-[10px] font-mono px-1.5 py-px rounded-full"
                  style={
                    it.badgeKind === "attn"
                      ? {
                          background: "rgba(251,191,36,0.12)",
                          color: "#fbbf24",
                          border: "1px solid rgba(251,191,36,0.3)",
                        }
                      : {
                          background: "rgba(212,165,116,0.15)",
                          color: "var(--accent)",
                          border: "1px solid rgba(212,165,116,0.3)",
                        }
                  }
                >
                  {it.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-3 border-t border-hair-soft space-y-1">
        <button
          onClick={onEnterOnboarding}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12px] text-faint hover:text-[--text] hover:bg-[#0d0d0d] whitespace-nowrap"
        >
          <Icon name="play" size={11} />
          <span>view onboarding</span>
        </button>
        <div className="px-3 pt-2 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#222] flex items-center justify-center text-[11px] font-mono">
            {user.initials ?? user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] truncate">{user.name}</div>
            <div className="text-[10.5px] font-mono text-faint truncate">
              profile · {user.publicProfile ? "public" : "private"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-faint hover:text-[--text] transition-colors"
            title="Log out"
          >
            <Icon name="logout" size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
