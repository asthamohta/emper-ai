"use client";

import * as React from "react";
import { Icon } from "./Icon";
import { CHAT_HISTORY_USER_PROMPT } from "@/lib/prompts/chat-history-user-prompt";

interface ChatHistoryPasteModalProps {
  open: boolean;
  onClose: () => void;
}

type Provider = "claude" | "chatgpt" | "gemini" | "grok";

/**
 * Modal where the candidate pastes the 13-section behavioral profile they
 * generated from another AI. Posts to /api/ingest/chat-history which writes
 * to candidate_documents and triggers a persona rebuild in the background.
 *
 * This is the Part 3 UI hook — minimum viable degradation per the plan.
 * A proper inline Onboarding step is a future polish item.
 */
export function ChatHistoryPasteModal({ open, onClose }: ChatHistoryPasteModalProps) {
  const [provider, setProvider] = React.useState<Provider>("claude");
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const hasSectionHeader = /(?:section\s*\d|^\s*\d+\.\s)/im.test(text);
  const charCount = text.trim().length;
  const canSubmit = !submitting && charCount >= 500 && hasSectionHeader;

  async function copyPrompt() {
    await navigator.clipboard.writeText(CHAT_HISTORY_USER_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ingest/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, rawText: text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="card w-full max-w-[680px] max-h-[88vh] flex flex-col overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-hair">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(212,165,116,0.12)",
              border: "1px solid rgba(212,165,116,0.3)",
            }}
          >
            <Icon name="spark" size={12} className="text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-[14px]">Add AI chat history</div>
            <div className="font-mono text-[10.5px] text-faint">
              import behavioral signal from another AI
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-5">
          {success ? (
            <div className="text-center py-12">
              <div
                className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{
                  background: "rgba(124,255,178,0.12)",
                  border: "1px solid rgba(124,255,178,0.3)",
                }}
              >
                <Icon name="spark" size={18} className="text-emerald-400" />
              </div>
              <div className="font-serif-h text-[20px] mb-2">
                Got it — building your profile
              </div>
              <p className="font-serif-h text-[14px] text-dim leading-relaxed max-w-[420px] mx-auto" style={{ fontWeight: 300 }}>
                Your chat history is in. We&apos;re rebuilding your persona with the
                new behavioral signal merged in. Reload your dashboard in ~30s to
                see corroborated claims.
              </p>
              <button onClick={onClose} className="btn mt-6">
                close
              </button>
            </div>
          ) : (
            <>
              <ol className="space-y-5">
                <li>
                  <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-2">
                    step 1 · pick your AI
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {(["claude", "chatgpt", "gemini", "grok"] as Provider[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setProvider(p)}
                        className={`btn ${
                          provider === p ? "btn-accent" : "btn-ghost"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </li>

                <li>
                  <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-2">
                    step 2 · copy this prompt and paste it into {provider}
                  </div>
                  <div className="rounded-md border border-hair bg-elev/40 px-3 py-3 max-h-[180px] overflow-auto">
                    <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-dim">
                      {CHAT_HISTORY_USER_PROMPT}
                    </pre>
                  </div>
                  <button
                    onClick={copyPrompt}
                    className="btn mt-2"
                  >
                    <Icon name="doc" size={12} />
                    <span>{copied ? "copied" : "copy prompt"}</span>
                  </button>
                </li>

                <li>
                  <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-2">
                    step 3 · paste {provider}&apos;s response below
                  </div>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={`Paste the 13-section response from ${provider} here...`}
                    rows={10}
                    className="w-full text-[12.5px] font-mono px-3 py-2 rounded-md border border-hair bg-elev/40 placeholder:text-faint resize-none"
                  />
                  <div className="font-mono text-[10px] text-faint mt-1.5 flex items-center justify-between">
                    <span>
                      {charCount} chars · 500 min · 50,000 max
                    </span>
                    <span>
                      {hasSectionHeader ? (
                        <span className="text-emerald-500">✓ section headers detected</span>
                      ) : charCount > 0 ? (
                        <span>looking for &quot;1.&quot;, &quot;2.&quot;, or &quot;Section&quot; markers…</span>
                      ) : null}
                    </span>
                  </div>
                </li>
              </ol>

              {error ? (
                <div className="mt-4 p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[12px]">
                  {error}
                </div>
              ) : null}
            </>
          )}
        </div>

        {!success ? (
          <div className="border-t border-hair p-3 flex items-center justify-between">
            <span className="font-mono text-[10px] text-faint">
              your paste stays private · identifiers stripped before claims are created
            </span>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="btn btn-accent disabled:opacity-40"
            >
              {submitting ? "uploading…" : "submit"}
              {!submitting ? <Icon name="arrow-right" size={12} /> : null}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
