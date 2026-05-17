"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";

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
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantText,
          };
          return updated;
        });
      }

      const newTurn = turnCount + 1;
      setTurnCount(newTurn);

      // After enough turns, save and complete
      if (newTurn >= WRAP_UP_TURNS) {
        await saveGoals(newMessages, assistantText);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function saveGoals(conversationMessages: Message[], lastAssistant: string) {
    const goalsSummary = conversationMessages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" | ");

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conversationMessages,
        saveGoals: {
          conversation_summary: goalsSummary,
          completed_at: new Date().toISOString(),
        },
      }),
    });

    setDone(true);
    onComplete({ conversation_summary: goalsSummary });
  }

  async function handleDone() {
    const goalsSummary = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" | ");
    await saveGoals(messages, "");
  }

  return (
    <div className="flex flex-col h-[500px] rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.content || (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce delay-0 w-1 h-1 bg-gray-400 rounded-full" />
                  <span className="animate-bounce delay-75 w-1 h-1 bg-gray-400 rounded-full" />
                  <span className="animate-bounce delay-150 w-1 h-1 bg-gray-400 rounded-full" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!done ? (
        <div className="border-t p-3 bg-gray-50 flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Share your thoughts…"
            disabled={loading}
            className="flex-1 px-3.5 py-2.5 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
          />
          {turnCount >= 4 && (
            <button
              onClick={handleDone}
              className="px-3 py-2.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white transition-colors"
            >
              Done
            </button>
          )}
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : (
        <div className="border-t p-4 bg-emerald-50 flex items-center gap-2 text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Got it — your preferences are saved. Finding your matches now.
        </div>
      )}
    </div>
  );
}
