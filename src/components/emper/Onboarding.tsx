"use client";

import * as React from "react";
import { Icon } from "./Icon";

interface OnboardingProps {
  onExit: () => void;
  liveBackend: boolean;
  userFirstName: string;
}

export function Onboarding({
  onExit,
  liveBackend,
  userFirstName,
}: OnboardingProps) {
  const [step, setStep] = React.useState(0);
  const [extractedAttrs, setExtractedAttrs] =
    React.useState<Record<string, string> | null>(null);
  const [stagedFiles, setStagedFiles] = React.useState<File[]>([]);

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-hair-soft">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded-[5px] flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#d4a574,#8a6a47)" }}
          >
            <div className="w-1.5 h-1.5 rounded-[2px] bg-black/70" />
          </div>
          <span className="font-serif-h text-[15px] leading-none">emper</span>
          <span className="font-mono text-[10px] text-faint mt-1">/ai</span>
          <span className="text-faint mx-3">·</span>
          <span className="font-mono text-[10.5px] text-dim uppercase tracking-wider">
            onboarding
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[2px] rounded-full transition-all"
                style={{
                  width: i === step ? 28 : 16,
                  background: i <= step ? "var(--accent)" : "var(--border)",
                }}
              />
            ))}
          </div>
          <span className="font-mono text-[10.5px] text-faint">{step + 1}/4</span>
          <button onClick={onExit} className="btn btn-ghost text-faint">
            <Icon name="x" size={12} />
            exit
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {step === 0 && (
          <DumpStep
            onNext={(files) => {
              setStagedFiles(files);
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <ProcessingStep
            files={stagedFiles}
            liveBackend={liveBackend}
            onNext={(attrs) => {
              setExtractedAttrs(attrs);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <FirstChatStep
            userFirstName={userFirstName}
            liveBackend={liveBackend}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <PreviewStep extractedAttrs={extractedAttrs} onDone={onExit} />
        )}
      </div>
    </div>
  );
}

type StagedFile = { file?: File; name: string; size: string; id: string };

function DumpStep({ onNext }: { onNext: (files: File[]) => void }) {
  const [staged, setStaged] = React.useState<StagedFile[]>([]);
  const [hover, setHover] = React.useState(false);
  const [github, setGithub] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).map((f) => ({
      file: f,
      name: f.name,
      size: formatSize(f.size),
      id: `${f.name}-${f.size}-${Math.random()}`,
    }));
    setStaged((s) => [...s, ...arr]);
  };

  return (
    <div className="max-w-[720px] mx-auto px-8 pt-16 pb-12">
      <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
        step 01 · dump
      </div>
      <h1 className="font-serif-h text-[40px] leading-tight tracking-tight mb-3">
        Drop everything that represents you.
      </h1>
      <p
        className="font-serif-h text-[16px] text-dim leading-relaxed max-w-[520px]"
        style={{ fontWeight: 300 }}
      >
        Resumes, LinkedIn export, SOPs, project docs, blog posts. Nothing is shown
        to anyone — Kira reads them, extracts attributes, then discards the raw
        files if you want.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setHover(true);
        }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => {
          e.preventDefault();
          setHover(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="dropzone mt-8 rounded-lg border-2 border-dashed transition-colors cursor-pointer"
        style={{
          borderColor: hover ? "var(--accent)" : "var(--border)",
          background: hover ? "rgba(212,165,116,0.04)" : undefined,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.md,.docx,.zip,.txt"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="px-8 py-12 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{
              background: "rgba(212,165,116,0.08)",
              border: "1px solid rgba(212,165,116,0.25)",
            }}
          >
            <Icon name="upload" size={18} className="text-accent" />
          </div>
          <div className="font-serif-h text-[18px]">Drag files here</div>
          <div className="font-mono text-[11px] text-faint mt-1.5">
            .pdf · .md · .docx · .zip · .txt · up to 50 MB each
          </div>
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="btn"
            >
              <Icon name="plus" size={12} />
              browse files
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-md border border-hair bg-elev/40">
        <Icon name="github" size={14} className="text-dim" />
        <input
          value={github}
          onChange={(e) => setGithub(e.target.value)}
          placeholder="github.com/yourname"
          className="flex-1 text-[13px] font-mono placeholder:text-faint"
        />
        <button
          onClick={() => {
            if (github) {
              setStaged((s) => [
                ...s,
                {
                  name: github,
                  size: "—",
                  id: `gh-${github}-${Math.random()}`,
                },
              ]);
              setGithub("");
            }
          }}
          className="btn btn-ghost text-faint"
        >
          add
        </button>
      </div>

      {staged.length > 0 && (
        <div className="mt-8">
          <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider mb-2">
            {staged.length} added
          </div>
          <div className="space-y-1.5">
            {staged.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 px-3 py-2 rounded-md border border-hair-soft bg-elev/30"
              >
                <Icon name="doc" size={13} className="text-dim" />
                <span className="text-[12.5px] font-mono flex-1 truncate">
                  {f.name}
                </span>
                <span className="font-mono text-[10.5px] text-faint">{f.size}</span>
                <button
                  onClick={() => setStaged((arr) => arr.filter((x) => x.id !== f.id))}
                  className="text-faint hover:text-[--text]"
                >
                  <Icon name="x" size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 pt-6 border-t border-hair-soft flex items-center justify-between">
        <button
          onClick={() => onNext([])}
          className="font-mono text-[11.5px] text-faint hover:text-dim"
        >
          I&apos;ll add more later →
        </button>
        <button
          onClick={() =>
            onNext(staged.map((s) => s.file).filter((f): f is File => !!f))
          }
          className="btn btn-accent"
        >
          Process {staged.length}{" "}
          {staged.length === 1 ? "document" : "documents"}
          <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}

function ProcessingStep({
  files,
  liveBackend,
  onNext,
}: {
  files: File[];
  liveBackend: boolean;
  onNext: (attrs: Record<string, string> | null) => void;
}) {
  const events = React.useMemo(
    () => [
      { t: 300, label: "ingesting resume.pdf" },
      { t: 900, label: "parsing linkedin-export.zip" },
      { t: 1500, label: "cloning github · 43 repos" },
      { t: 2200, label: "extracting roles · 4 found" },
      { t: 2900, label: "extracting shipped projects · 7 found" },
      { t: 3600, label: "extracting skills · 12 found" },
      { t: 4300, label: "cross-referencing timeline" },
      { t: 5000, label: "drafting first conversation" },
    ],
    []
  );

  const [now, setNow] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [extracted, setExtracted] = React.useState<Record<string, string> | null>(
    null
  );

  React.useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setNow(Date.now() - start), 100);

    let cancelled = false;

    async function run() {
      // Real upload — only if backend live AND we have real files.
      let realResult: Record<string, string> | null = null;
      if (liveBackend && files.length > 0) {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));
        try {
          const res = await fetch("/api/ingest/candidate", {
            method: "POST",
            body: form,
          });
          if (res.ok) {
            const json = await res.json();
            realResult = (json.extractedContext as Record<string, string>) ?? null;
          }
        } catch {
          // ignore; fall through to mock attrs
        }
      }
      // Floor the visible processing at 5.4s so the user sees the event log
      const remaining = Math.max(0, 5400 - (Date.now() - start));
      setTimeout(() => {
        if (cancelled) return;
        setExtracted(realResult);
        setDone(true);
        clearInterval(id);
      }, remaining);
    }

    run();

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [files, liveBackend]);

  const counters = [
    { label: "roles found", target: 4, t: 2200 },
    { label: "shipped projects", target: 7, t: 2900 },
    { label: "skills", target: 12, t: 3600 },
    { label: "attributes", target: 81, t: 4500 },
  ];

  return (
    <div className="max-w-[680px] mx-auto px-8 pt-20 pb-12">
      <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
        step 02 · processing
      </div>
      <h1 className="font-serif-h text-[36px] leading-tight tracking-tight mb-2">
        Kira is reading through what you shared…
      </h1>
      <p className="font-serif-h text-[15.5px] text-dim" style={{ fontWeight: 300 }}>
        Usually takes 30 seconds. Sometimes less.
      </p>

      <div className="mt-10 grid grid-cols-4 gap-3">
        {counters.map((c, i) => {
          const active = now >= c.t;
          const val = active ? c.target : 0;
          return (
            <div key={i} className="card p-4">
              <div
                className={`font-serif-h text-[32px] ${
                  active ? "text-accent" : "text-faint"
                } transition-colors`}
                style={{ fontWeight: 300 }}
              >
                {val}
              </div>
              <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider mt-1">
                {c.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 card p-5 font-mono text-[12px] space-y-1.5 min-h-[260px]">
        {events.map((ev, i) => {
          const visible = now >= ev.t;
          const current =
            visible && (i === events.length - 1 || now < events[i + 1].t);
          if (!visible) return null;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-faint">
                {String(Math.floor(ev.t / 100)).padStart(4, "0")}
              </span>
              {current && !done ? (
                <span className="text-accent shimmer">●</span>
              ) : (
                <span className="text-[#7cffb2]">✓</span>
              )}
              <span className={current && !done ? "text-[--text]" : "text-dim"}>
                {ev.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="font-mono text-[10.5px] text-faint">
          {done ? "done · 81 attributes extracted" : "processing…"}
        </div>
        <button
          onClick={() => onNext(extracted)}
          disabled={!done}
          className={done ? "btn btn-accent" : "btn"}
          style={!done ? { opacity: 0.4 } : {}}
        >
          Continue
          <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}

function FirstChatStep({
  liveBackend,
  userFirstName,
  onNext,
}: {
  liveBackend: boolean;
  userFirstName: string;
  onNext: () => void;
}) {
  type Msg = { from: "kira" | "user"; text: string };
  const opening: Msg[] = React.useMemo(
    () => [
      {
        from: "kira",
        text: `Hey ${userFirstName}. I've read through what you sent. I have a few things I can't get from documents.`,
      },
      {
        from: "kira",
        text: "Walk me through why you're looking right now — not what's on your LinkedIn, the actual reason.",
      },
    ],
    [userFirstName]
  );

  const fallbackFollowups = React.useMemo<Msg[]>(
    () => [
      {
        from: "kira",
        text: "Got it. So it's about distance from impact, not the work itself. That's useful — different intros.",
      },
      {
        from: "kira",
        text: "Two more — on the kind of company you'd join next. Stage matters more than you think. What size org are you targeting?",
      },
      {
        from: "kira",
        text: "Last one. Are there any sectors you'd refuse to work on, regardless of comp?",
      },
      {
        from: "kira",
        text: "That's everything I needed. Building your profile now. You can always tell me more later — I'll surface gaps as I notice them.",
      },
    ],
    []
  );

  const [msgs, setMsgs] = React.useState<Msg[]>(opening);
  const [input, setInput] = React.useState("");
  const [turn, setTurn] = React.useState(0);
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const MAX_TURNS = 4;

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);

  async function send() {
    if (!input.trim() || sending || turn >= MAX_TURNS) return;
    const userText = input.trim();
    setInput("");
    const newMsgs: Msg[] = [...msgs, { from: "user", text: userText }];
    setMsgs(newMsgs);
    setSending(true);

    if (!liveBackend) {
      setTimeout(() => {
        setMsgs((m) => [...m, fallbackFollowups[turn]]);
        setTurn((t) => t + 1);
        setSending(false);
      }, 700);
      return;
    }

    try {
      const history = newMsgs.map((m) => ({
        role: m.from === "kira" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      setMsgs((m) => [...m, { from: "kira", text: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMsgs((m) => {
          const next = [...m];
          next[next.length - 1] = { from: "kira", text: acc };
          return next;
        });
      }
      setTurn((t) => t + 1);
    } catch {
      setMsgs((m) => [...m, fallbackFollowups[turn]]);
      setTurn((t) => t + 1);
    } finally {
      setSending(false);
    }
  }

  const canContinue = turn >= MAX_TURNS;

  async function handleFinish() {
    // Persist conversation summary to backend (best-effort)
    if (liveBackend) {
      const goalsSummary = msgs
        .filter((m) => m.from === "user")
        .map((m) => m.text)
        .join(" | ");
      try {
        await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: msgs.map((m) => ({
              role: m.from === "kira" ? "assistant" : "user",
              content: m.text,
            })),
            saveGoals: {
              conversation_summary: goalsSummary,
              completed_at: new Date().toISOString(),
            },
          }),
        });
        // Kick off match computation in the background
        fetch("/api/match/run", { method: "POST" }).catch(() => {});
      } catch {
        // best-effort
      }
    }
    onNext();
  }

  return (
    <div
      className="max-w-[680px] mx-auto px-8 pt-12 pb-12 flex flex-col"
      style={{ minHeight: "calc(100vh - 64px)" }}
    >
      <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
        step 03 · first conversation
      </div>
      <h1 className="font-serif-h text-[30px] leading-tight tracking-tight mb-2">
        Kira has a few things to ask.
      </h1>
      <p className="font-mono text-[11.5px] text-dim mb-6">
        gaps documents can&apos;t fill · ~5 min · text or voice
      </p>

      <div
        ref={scrollRef}
        className="flex-1 card p-6 space-y-5 overflow-auto"
        style={{ minHeight: 380 }}
      >
        {msgs.map((m, i) => (
          <div key={i} className="flex gap-3">
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
              {m.from === "kira" ? "K" : "Y"}
            </div>
            <div className="flex-1">
              <div className="font-mono text-[10px] text-faint uppercase tracking-wider mb-1">
                {m.from === "kira" ? "Kira" : "you"}
              </div>
              <div
                className="font-serif-h text-[15px] leading-relaxed"
                style={{ fontWeight: 300 }}
              >
                {m.text || (
                  <span className="text-faint font-mono text-[11px]">…</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-md border border-hair bg-elev/40">
        <Icon name="mic" size={13} className="text-faint" />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={
            canContinue
              ? "Kira's done. Continue below."
              : sending
              ? "Kira is thinking…"
              : "answer Kira…"
          }
          disabled={canContinue || sending}
          className="flex-1 text-[13.5px] placeholder:text-faint disabled:opacity-50"
        />
        <button
          onClick={send}
          disabled={!input.trim() || canContinue || sending}
          className="btn btn-accent py-1 px-2 disabled:opacity-40"
        >
          <Icon name="send" size={11} />
        </button>
      </div>
      <div className="font-mono text-[10px] text-faint mt-2 px-1 flex items-center justify-between">
        <span>
          question {Math.min(turn + 1, MAX_TURNS + 1)} of {MAX_TURNS + 1}
        </span>
        <button
          onClick={handleFinish}
          disabled={!canContinue}
          className={
            canContinue ? "text-accent hover:underline" : "text-faint cursor-not-allowed"
          }
        >
          {canContinue ? "see your profile →" : "skip remaining questions"}
        </button>
      </div>
    </div>
  );
}

function PreviewStep({
  extractedAttrs,
  onDone,
}: {
  extractedAttrs: Record<string, string> | null;
  onDone: () => void;
}) {
  const [isPublic, setIsPublic] = React.useState(true);

  const arcBody =
    extractedAttrs?.career_trajectory ??
    extractedAttrs?.summary ??
    "Your career narrative will appear here once Kira finishes processing — built from your documents and the first conversation.";

  const howIWorkBody =
    extractedAttrs?.working_style ??
    extractedAttrs?.communication_style ??
    "How you work — your collaboration style, tooling, and the way you communicate — synthesized from your documents.";

  const optimizingBody =
    extractedAttrs?.values ??
    extractedAttrs?.intellectual_interests ??
    "What you're optimizing for — Kira surfaces this from your goals chat and the patterns in your docs.";

  return (
    <div className="max-w-[760px] mx-auto px-8 pt-12 pb-12">
      <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
        step 04 · preview
      </div>
      <h1 className="font-serif-h text-[34px] leading-tight tracking-tight mb-2">
        Here&apos;s how Kira sees you.
      </h1>
      <p
        className="font-serif-h text-[15px] text-dim mb-8"
        style={{ fontWeight: 300 }}
      >
        Review, then set whether companies can see this. You can edit anything
        later.
      </p>

      <div className="card p-8 mb-6">
        <h2 className="font-serif-h text-[28px] leading-tight">Your profile</h2>
        <div className="font-mono text-[11px] text-dim mt-1.5">
          {extractedAttrs?.experience_level ?? "engineer"} ·{" "}
          {extractedAttrs?.industries ?? "—"}
        </div>

        <div className="mt-8">
          <div className="font-serif-h text-[18px] mb-2">The arc</div>
          <p
            className="font-serif-h text-[14.5px] leading-relaxed text-dim"
            style={{ fontWeight: 300 }}
          >
            {arcBody}
          </p>
        </div>
        <div className="mt-6">
          <div className="font-serif-h text-[18px] mb-2">How I work</div>
          <p
            className="font-serif-h text-[14.5px] leading-relaxed text-dim"
            style={{ fontWeight: 300 }}
          >
            {howIWorkBody}
          </p>
        </div>
        <div className="mt-6">
          <div className="font-serif-h text-[18px] mb-2">What I&apos;m optimizing for</div>
          <p
            className="font-serif-h text-[14.5px] leading-relaxed text-dim"
            style={{ fontWeight: 300 }}
          >
            {optimizingBody}
          </p>
        </div>
        <div className="mt-6 font-mono text-[10.5px] text-faint">
          + more sections · attributes ·
          {extractedAttrs
            ? " built from your documents and a conversation"
            : " preview"}
        </div>
      </div>

      <div className="card p-5 mb-6">
        <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
          privacy
        </div>
        <div className="space-y-2">
          {[
            {
              k: true,
              t: "Public",
              d: "Kira can surface you to companies that match your criteria. You see every intro before they see anything about you.",
            },
            {
              k: false,
              t: "Private",
              d: "Profile stays hidden. Useful if you're not actively looking — Kira keeps learning, doesn't reach out.",
            },
          ].map((opt) => (
            <button
              key={String(opt.k)}
              onClick={() => setIsPublic(opt.k)}
              className={`w-full flex items-start gap-3 p-3 rounded-md border text-left transition-colors ${
                isPublic === opt.k
                  ? "border-[rgba(212,165,116,0.5)] bg-[rgba(212,165,116,0.04)]"
                  : "border-hair hover:border-[#262626]"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full mt-1 border-2 ${
                  isPublic === opt.k ? "border-[--accent]" : "border-[#333]"
                }`}
                style={
                  isPublic === opt.k
                    ? {
                        boxShadow:
                          "inset 0 0 0 2px var(--bg), inset 0 0 0 5px var(--accent)",
                      }
                    : {}
                }
              />
              <div>
                <div className="text-[13.5px]">{opt.t}</div>
                <div className="text-[12.5px] text-dim mt-0.5 leading-relaxed">
                  {opt.d}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={onDone} className="btn btn-ghost text-faint">
          <Icon name="back" size={12} />
          tweak first
        </button>
        <button onClick={onDone} className="btn btn-accent">
          Confirm profile
          <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}
