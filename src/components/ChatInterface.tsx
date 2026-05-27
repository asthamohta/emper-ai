"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatInterfaceProps {
  onComplete: (goals: Record<string, string>) => void;
  initialMessage?: string;
}

const OPENING_MESSAGE =
  "Hey! Before we match you with roles, I'd love to understand what you're actually looking for — not just the job title, but the real stuff. So let's start simple: what's driving you to look right now? What's missing in your current or last role?";

const WRAP_UP_TURNS = 7;

export default function ChatInterface({
  onComplete,
  initialMessage = OPENING_MESSAGE,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: initialMessage },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [turnCount, setTurnCount] = useState(0);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (!res.ok || !res.body) throw new Error("Chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
      const newTurn = turnCount + 1;
      setTurnCount(newTurn);
      if (newTurn >= WRAP_UP_TURNS) await saveGoals(newMessages, assistantText);
    } catch {}
    finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function saveGoals(conversationMessages: Message[], _lastAssistant: string) {
    const goalsSummary = conversationMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" | ");
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversationMessages,
        saveGoals: { conversation_summary: goalsSummary, completed_at: new Date().toISOString() },
      }),
    });
    setDone(true);
    onComplete({ conversation_summary: goalsSummary });
  }

  async function handleDone() {
    const goalsSummary = messages.filter((m) => m.role === "user").map((m) => m.content).join(" | ");
    await saveGoals(messages, "");
  }

  return (
    <div className="flex flex-col rounded-lg border border-hair overflow-hidden" style={{ height: 480 }}>
      <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: "var(--bg)" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-mono text-[10px]"
              style={
                msg.role === "assistant"
                  ? { background: "rgba(212,165,116,0.12)", border: "1px solid rgba(212,165,116,0.3)", color: "var(--accent)" }
                  : { background: "#1f1f1f", color: "var(--text-dim)" }
              }
            >
              {msg.role === "assistant" ? "K" : "Y"}
            </div>
            <div
              className="max-w-[78%] px-4 py-2.5 rounded-lg text-[13.5px] font-serif-h leading-relaxed"
              style={
                msg.role === "user"
                  ? { background: "rgba(212,165,116,0.1)", border: "1px solid rgba(212,165,116,0.2)", color: "var(--text)", fontWeight: 300 }
                  : { background: "var(--bg-elev-2)", border: "1px solid var(--border)", color: "var(--text-dim)", fontWeight: 300 }
              }
            >
              {msg.content || (
                <span className="flex gap-1 items-center">
                  <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {!done ? (
        <div
          className="border-t border-hair flex gap-2 items-center px-3 py-2.5"
          style={{ background: "var(--bg-elev)" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Share your thoughts…"
            disabled={loading}
            className="flex-1 px-3 py-2 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint disabled:opacity-50 outline-none focus:border-[rgba(212,165,116,0.5)] transition-colors"
            style={{ background: "var(--bg-elev-2)" }}
          />
          {turnCount >= 4 && (
            <button onClick={handleDone} className="btn btn-ghost font-mono text-[11px]">
              done
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="btn btn-accent py-2 px-2.5 disabled:opacity-40"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" />
            </svg>
          </button>
        </div>
      ) : (
        <div
          className="border-t border-hair px-5 py-3 flex items-center gap-2 font-mono text-[11.5px]"
          style={{ background: "rgba(124,255,178,0.06)", color: "var(--good)" }}
        >
          ✓ Your preferences are saved. Finding matches now.
        </div>
      )}
    </div>
  );
}
