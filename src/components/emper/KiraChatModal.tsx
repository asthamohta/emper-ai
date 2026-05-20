"use client";

import * as React from "react";
import { Icon } from "./Icon";

interface KiraChatModalProps {
  open: boolean;
  onClose: () => void;
  gapMode: boolean;
  liveBackend: boolean;
  userInitials: string;
  userFirstName: string;
}

type Msg = { from: "kira" | "user"; text: string };

const FALLBACK_REPLIES = [
  "Noted. Thinking about that — say more about why that one specifically. Was there a specific moment, or has it built up?",
  "Got it. That's useful context. One more — what about the kind of team you'd want around you?",
  "That tracks. Last thing — anything you'd refuse to work on, regardless of comp?",
];

export function KiraChatModal({
  open,
  onClose,
  gapMode,
  liveBackend,
  userInitials,
  userFirstName,
}: KiraChatModalProps) {
  const [messages, setMessages] = React.useState<Msg[]>(() =>
    gapMode
      ? [
          {
            from: "kira",
            text: `Hey ${userFirstName}. I have three things I want to nail down to make your profile sharper. Quick ones.`,
          },
          {
            from: "kira",
            text: "First — you mentioned wanting to be employee #15 to 60. Is there a particular product surface you'd refuse to work on? Crypto, defense, ad-tech, anything else?",
          },
        ]
      : [{ from: "kira", text: `Hey ${userFirstName}. What's on your mind?` }]
  );
  const [input, setInput] = React.useState("");
  const [mode, setMode] = React.useState<"text" | "voice">("text");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fallbackIdxRef = React.useRef(0);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    if (!input.trim() || sending) return;
    const userText = input.trim();
    setInput("");
    setMessages((m) => [...m, { from: "user", text: userText }]);
    setSending(true);

    if (!liveBackend) {
      const reply =
        FALLBACK_REPLIES[fallbackIdxRef.current % FALLBACK_REPLIES.length];
      fallbackIdxRef.current += 1;
      setTimeout(() => {
        setMessages((m) => [...m, { from: "kira", text: reply }]);
        setSending(false);
      }, 700);
      return;
    }

    try {
      const history = [
        ...messages.map((m) => ({
          role: m.from === "kira" ? ("assistant" as const) : ("user" as const),
          content: m.text,
        })),
        { role: "user" as const, content: userText },
      ];
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMessages((m) => [...m, { from: "kira", text: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { from: "kira", text: acc };
          return next;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        {
          from: "kira",
          text: "Couldn't reach the server just now. Mind trying again in a sec?",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="card w-full max-w-[640px] h-[640px] flex flex-col overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-hair">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(212,165,116,0.12)",
              border: "1px solid rgba(212,165,116,0.3)",
            }}
          >
            <Icon name="spark" size={14} className="text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-[14px]">Kira</div>
            <div className="font-mono text-[10.5px] text-faint">
              {gapMode
                ? "3 questions to sharpen your profile"
                : "your personal AI agent"}
            </div>
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-md border border-hair">
            <button
              onClick={() => setMode("text")}
              className={`px-2 py-1 rounded ${
                mode === "text" ? "bg-[#1a1a1a]" : "text-faint"
              }`}
            >
              <Icon name="chat" size={12} />
            </button>
            <button
              onClick={() => setMode("voice")}
              className={`px-2 py-1 rounded ${
                mode === "voice" ? "bg-[#1a1a1a] text-accent" : "text-faint"
              }`}
            >
              <Icon name="mic" size={12} />
            </button>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <Icon name="x" size={14} />
          </button>
        </div>

        {mode === "text" ? (
          <>
            <div ref={scrollRef} className="flex-1 overflow-auto px-5 py-5 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className="flex gap-3">
                  <div
                    className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center font-mono text-[9.5px]"
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
                    {m.from === "kira" ? "K" : userInitials}
                  </div>
                  <div
                    className="flex-1 font-serif-h text-[14.5px] leading-relaxed pt-px"
                    style={{ fontWeight: 300 }}
                  >
                    {m.text || (
                      <span className="text-faint font-mono text-[11px]">…</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-hair p-3">
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-hair bg-elev/40">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={sending ? "Kira is thinking…" : "reply to Kira…"}
                  disabled={sending}
                  className="flex-1 text-[13.5px] placeholder:text-faint disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="btn btn-accent py-1 px-2 disabled:opacity-40"
                >
                  <Icon name="send" size={11} />
                </button>
              </div>
              <div className="font-mono text-[10px] text-faint mt-2 px-1 flex items-center justify-between">
                <span>
                  your conversation stays private · only attributes get added to Self
                </span>
                <span>
                  <span className="kbd">↵</span> send
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center mb-6 relative"
              style={{
                background: "rgba(212,165,116,0.06)",
                border: "1px solid rgba(212,165,116,0.25)",
              }}
            >
              <div
                className="absolute inset-2 rounded-full"
                style={{ background: "rgba(212,165,116,0.08)" }}
              />
              <div
                className="absolute inset-6 rounded-full"
                style={{ background: "rgba(212,165,116,0.12)" }}
              />
              <Icon name="mic" size={26} className="text-accent relative" />
            </div>
            <div className="font-serif-h text-[20px]" style={{ fontWeight: 300 }}>
              Listening…
            </div>
            <div className="font-mono text-[11px] text-faint mt-2">
              tap mic to mute · esc to switch back to text
            </div>
            <div
              className="mt-8 max-w-[420px] text-center font-serif-h text-[14.5px] text-dim leading-relaxed"
              style={{ fontWeight: 300 }}
            >
              &ldquo;Hey {userFirstName}. I have three things I want to nail down to
              make your profile sharper. First — is there a particular product
              surface you&apos;d refuse to work on?&rdquo;
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
