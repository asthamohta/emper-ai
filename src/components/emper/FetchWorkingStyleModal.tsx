"use client";

import * as React from "react";
import { Icon } from "./Icon";
import { WORKING_STYLE_PROMPT } from "@/lib/prompts/working-style-prompt";

interface FetchWorkingStyleModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

type Phase = "copy" | "paste" | "review" | "saving" | "done" | "error";

export function FetchWorkingStyleModal({
  open,
  onClose,
  onSaved,
}: FetchWorkingStyleModalProps) {
  const [phase, setPhase] = React.useState<Phase>("copy");
  const [copied, setCopied] = React.useState(false);
  const [pastedText, setPastedText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setPhase("copy");
      setCopied(false);
      setPastedText("");
      setError(null);
    }
  }, [open]);

  async function copyPrompt() {
    await navigator.clipboard.writeText(WORKING_STYLE_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReview() {
    const trimmed = pastedText.trim();
    if (trimmed.length < 500) {
      setError("Response looks too short — paste the full output from Claude.");
      return;
    }
    const hasSections = /section\s*\d|^\s*\d+\.\s/im.test(trimmed);
    if (!hasSections) {
      setError("Doesn't look like the right format — make sure you pasted Claude's full response.");
      return;
    }
    setError(null);
    setPhase("review");
  }

  async function saveProfile() {
    setPhase("saving");
    setError(null);
    try {
      const res = await fetch("/api/ingest/chat-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "claude", rawText: pastedText.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setPhase("done");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="card w-full max-w-[720px] max-h-[88vh] flex flex-col overflow-hidden"
        style={{ background: "var(--bg)" }}
      >
        {/* Header */}
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
            <div className="text-[14px]">Fetch working style from Claude</div>
            <div className="font-mono text-[10.5px] text-faint">
              {phase === "copy" && "step 1 of 3 · copy the prompt"}
              {phase === "paste" && "step 2 of 3 · paste claude's response"}
              {phase === "review" && "step 3 of 3 · review · read-only"}
              {(phase === "saving" || phase === "done" || phase === "error") && "saving to your profile"}
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-1.5">
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-5">

          {/* Step 1: copy prompt */}
          {phase === "copy" && (
            <div className="space-y-4">
              <p className="font-serif-h text-[13.5px] text-dim leading-relaxed" style={{ fontWeight: 300 }}>
                Open Claude.ai, paste this prompt into the chat, and let it run.
                Claude will look through your past conversations and write a
                structured behavioral profile. Come back and paste the response
                in the next step.
              </p>
              <div className="rounded-md border border-hair bg-elev/40 px-4 py-3 max-h-[260px] overflow-auto">
                <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-dim">
                  {WORKING_STYLE_PROMPT}
                </pre>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={copyPrompt} className="btn btn-accent">
                  <Icon name="doc" size={12} />
                  <span>{copied ? "copied!" : "copy prompt"}</span>
                </button>
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                >
                  open claude.ai
                  <Icon name="arrow-right" size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Step 2: paste response */}
          {phase === "paste" && (
            <div className="space-y-3">
              <p className="font-serif-h text-[13px] text-dim leading-relaxed" style={{ fontWeight: 300 }}>
                Paste Claude&apos;s full response below. Once you click
                &ldquo;review&rdquo;, the text locks — you can approve or
                dismiss it but not edit it.
              </p>
              <textarea
                value={pastedText}
                onChange={(e) => { setPastedText(e.target.value); setError(null); }}
                placeholder="Paste Claude's response here…"
                rows={14}
                className="w-full text-[12.5px] font-mono px-3 py-2 rounded-md border border-hair bg-elev/40 placeholder:text-faint resize-none"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-faint">
                  {pastedText.trim().length} chars
                  {pastedText.trim().length > 0 && pastedText.trim().length < 500
                    ? " · needs at least 500"
                    : ""}
                </span>
                {error && (
                  <span className="font-mono text-[10.5px] text-rose-400">{error}</span>
                )}
              </div>
            </div>
          )}

          {/* Step 3: read-only review */}
          {phase === "review" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10.5px] text-accent uppercase tracking-wider">
                  review · read-only
                </span>
                <span className="font-mono text-[10px] text-faint">
                  — you cannot edit this
                </span>
              </div>
              <div
                className="rounded-md border border-hair bg-elev/40 px-4 py-4 overflow-auto"
                style={{ maxHeight: "54vh" }}
              >
                <pre className="font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-dim select-text">
                  {pastedText.trim()}
                </pre>
              </div>
              <p className="font-mono text-[10px] text-faint">
                identifiers are stripped · stays private until you share it with a company
              </p>
            </div>
          )}

          {phase === "saving" && (
            <div className="text-center py-16">
              <div className="font-mono text-[12px] text-dim animate-pulse">
                saving profile and rebuilding your persona…
              </div>
            </div>
          )}

          {phase === "done" && (
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
                Profile saved — rebuilding your persona
              </div>
              <p className="font-serif-h text-[14px] text-dim leading-relaxed max-w-[420px] mx-auto" style={{ fontWeight: 300 }}>
                The behavioral profile is in. Reload your dashboard in ~30s to
                see the updated claims.
              </p>
              <button onClick={onClose} className="btn mt-6">close</button>
            </div>
          )}

          {phase === "error" && (
            <div className="py-6 space-y-4">
              <div className="p-3 rounded-md border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[12px]">
                {error}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setError(null); setPhase("review"); }} className="btn">
                  back to review
                </button>
                <button onClick={() => { setError(null); setPhase("paste"); }} className="btn btn-ghost">
                  re-paste
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-hair p-3 flex items-center justify-between">
          {phase === "copy" && (
            <>
              <button onClick={onClose} className="btn btn-ghost text-faint text-[12px]">cancel</button>
              <button onClick={() => setPhase("paste")} className="btn btn-accent">
                <span>I&apos;ve got Claude&apos;s response</span>
                <Icon name="arrow-right" size={12} />
              </button>
            </>
          )}
          {phase === "paste" && (
            <>
              <button onClick={() => setPhase("copy")} className="btn btn-ghost text-faint text-[12px]">
                back
              </button>
              <button
                onClick={handleReview}
                disabled={pastedText.trim().length < 500}
                className="btn btn-accent disabled:opacity-40"
              >
                <span>review</span>
                <Icon name="arrow-right" size={12} />
              </button>
            </>
          )}
          {phase === "review" && (
            <>
              <button onClick={() => setPhase("paste")} className="btn btn-ghost text-faint text-[12px]">
                re-paste
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="btn btn-ghost text-[12px]">dismiss</button>
                <button onClick={saveProfile} className="btn btn-accent">
                  add to profile
                  <Icon name="arrow-right" size={12} />
                </button>
              </div>
            </>
          )}
          {(phase === "saving" || phase === "done") && (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
