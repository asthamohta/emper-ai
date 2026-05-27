"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// ── Icon ──────────────────────────────────────────────────────────────────────

function Icon({ name, size = 14, className = "" }: { name: string; size?: number; className?: string }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "arrow-right": return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
    case "back": return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>;
    case "plus": return <svg {...props}><path d="M12 5v14M5 12h14" /></svg>;
    case "x": return <svg {...props}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "upload": return <svg {...props}><path d="M12 4v12M6 10l6-6 6 6" /><path d="M4 20h16" /></svg>;
    case "doc": return <svg {...props}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" /></svg>;
    case "link": return <svg {...props}><path d="M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1" /><path d="M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" /></svg>;
    case "globe": return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" /></svg>;
    case "check": return <svg {...props}><path d="M4 12l5 5L20 6" /></svg>;
    case "spinner": return <svg {...props} className={`${className} animate-spin`}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>;
    default: return null;
  }
}

// ── Layout ────────────────────────────────────────────────────────────────────

function Header({ step, totalSteps }: { step: number; totalSteps: number }) {
  return (
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
        <span className="font-mono text-[10.5px] text-dim uppercase tracking-wider">company setup</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
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
        <span className="font-mono text-[10.5px] text-faint">{step + 1}/{totalSteps}</span>
      </div>
    </div>
  );
}

// ── Shared input ──────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="font-mono text-[10.5px] text-dim uppercase tracking-wider">{label}</label>
        {mono && <span className="font-mono text-[10px] text-faint">{mono}</span>}
      </div>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] outline-none transition-colors"
      style={{ background: "var(--bg-elev-2)" }}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] outline-none transition-colors resize-none"
      style={{ background: "var(--bg-elev-2)" }}
    />
  );
}

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
  accent,
}: {
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
  accent?: boolean;
}) {
  const [val, setVal] = React.useState("");
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (val.trim()) { onAdd(val.trim()); setVal(""); }
            }
          }}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] outline-none transition-colors"
          style={{ background: "var(--bg-elev-2)" }}
        />
        <button
          type="button"
          onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal(""); } }}
          className="btn"
        >
          <Icon name="plus" size={12} />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[11px]"
              style={
                accent
                  ? { background: "rgba(212,165,116,0.1)", border: "1px solid rgba(212,165,116,0.25)", color: "var(--accent)" }
                  : { background: "var(--bg-elev-2)", border: "1px solid var(--border)", color: "var(--text-dim)" }
              }
            >
              {t}
              <button onClick={() => onRemove(i)} className="opacity-60 hover:opacity-100">
                <Icon name="x" size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 1: Company profile + website ────────────────────────────────────────

type WebsiteStatus = "idle" | "crawling" | "done" | "error";

function ProfileStep({
  onNext,
}: {
  onNext: (data: { companyName: string; websiteUrl: string }) => void;
}) {
  const [companyName, setCompanyName] = React.useState("");
  const [websiteUrl, setWebsiteUrl] = React.useState("");
  const [websiteStatus, setWebsiteStatus] = React.useState<WebsiteStatus>("idle");
  const [pagesScraped, setPagesScraped] = React.useState(0);

  async function handleCrawl() {
    if (!websiteUrl.trim()) return;
    setWebsiteStatus("crawling");
    try {
      const res = await fetch("/api/ingest/company/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Crawl failed");
      setPagesScraped(data.pagesScraped ?? 0);
      setWebsiteStatus("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Crawl failed";
      toast.error(message);
      setWebsiteStatus("error");
    }
  }

  const canContinue = companyName.trim().length > 0;

  return (
    <div className="max-w-[680px] mx-auto px-8 pt-16 pb-12">
      <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
        step 01 · company profile
      </div>
      <h1 className="font-serif-h text-[40px] leading-tight tracking-tight mb-3">
        Tell us about your company.
      </h1>
      <p className="font-serif-h text-[16px] text-dim leading-relaxed max-w-[520px]" style={{ fontWeight: 300 }}>
        Add your website so Kira can read your culture, team, and mission — then candidates get better context before they even interview.
      </p>

      <div className="mt-10 space-y-6">
        <Field label="Company name">
          <TextInput
            value={companyName}
            onChange={setCompanyName}
            placeholder="Acme Corp"
          />
        </Field>

        <Field label="Company website" mono="optional — we'll crawl all pages">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md border border-hair" style={{ background: "var(--bg-elev-2)" }}>
                <Icon name="globe" size={14} className="text-dim shrink-0" />
                <input
                  value={websiteUrl}
                  onChange={(e) => { setWebsiteUrl(e.target.value); setWebsiteStatus("idle"); }}
                  placeholder="acme.com"
                  className="flex-1 text-[13px] font-mono placeholder:text-faint outline-none"
                  style={{ background: "transparent" }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCrawl(); }}
                />
              </div>
              <button
                onClick={handleCrawl}
                disabled={!websiteUrl.trim() || websiteStatus === "crawling"}
                className="btn btn-accent disabled:opacity-40"
              >
                {websiteStatus === "crawling" ? (
                  <>
                    <Icon name="spinner" size={12} />
                    crawling…
                  </>
                ) : "crawl site"}
              </button>
            </div>

            {websiteStatus === "crawling" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md font-mono text-[11px] text-dim" style={{ background: "var(--bg-elev-2)" }}>
                <Icon name="spinner" size={11} className="text-accent" />
                Crawling all pages on {websiteUrl} — this takes up to 60 seconds…
              </div>
            )}
            {websiteStatus === "done" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md font-mono text-[11px]" style={{ background: "rgba(124,255,178,0.06)", border: "1px solid rgba(124,255,178,0.2)" }}>
                <Icon name="check" size={11} className="text-[#7cffb2]" />
                <span className="text-[#7cffb2]">{pagesScraped} pages scraped and indexed.</span>
              </div>
            )}
            {websiteStatus === "error" && (
              <div className="px-3 py-2 rounded-md font-mono text-[11px] text-faint" style={{ background: "var(--bg-elev-2)" }}>
                Couldn't reach that URL. You can skip this and add it later.
              </div>
            )}
          </div>
        </Field>
      </div>

      <div className="mt-10 pt-6 border-t border-hair-soft flex items-center justify-between">
        <div className="font-mono text-[11px] text-faint">
          {websiteStatus === "done"
            ? `${pagesScraped} pages in context`
            : "website gives Kira richer candidate matching"}
        </div>
        <button
          onClick={() => onNext({ companyName, websiteUrl })}
          disabled={!canContinue}
          className="btn btn-accent disabled:opacity-40"
        >
          Continue
          <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Role details ──────────────────────────────────────────────────────

type Requirements = {
  title: string;
  description: string;
  hardRequirements: string[];
  softRequirements: string[];
  location: string;
  remote: boolean;
  compMin: number;
  compMax: number;
};

type JdFetchStatus = "idle" | "fetching" | "done" | "error";

function RoleStep({
  onBack,
  onNext,
}: {
  onBack: () => void;
  onNext: (req: Requirements) => void;
}) {
  const [req, setReq] = React.useState<Requirements>({
    title: "",
    description: "",
    hardRequirements: [],
    softRequirements: [],
    location: "",
    remote: false,
    compMin: 0,
    compMax: 0,
  });
  const [jdUrl, setJdUrl] = React.useState("");
  const [jdStatus, setJdStatus] = React.useState<JdFetchStatus>("idle");

  async function handleFetchJd() {
    if (!jdUrl.trim()) return;
    setJdStatus("fetching");
    try {
      const res = await fetch("/api/ingest/company/jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jdUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");
      // Pre-fill description from scraped text if empty
      if (!req.description.trim() && data.text) {
        setReq((r) => ({ ...r, description: String(data.text).slice(0, 2000) }));
      }
      setJdStatus("done");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Fetch failed";
      toast.error(message);
      setJdStatus("error");
    }
  }

  return (
    <div className="max-w-[680px] mx-auto px-8 pt-16 pb-12">
      <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
        step 02 · role details
      </div>
      <h1 className="font-serif-h text-[40px] leading-tight tracking-tight mb-3">
        What are you hiring for?
      </h1>
      <p className="font-serif-h text-[16px] text-dim leading-relaxed max-w-[520px]" style={{ fontWeight: 300 }}>
        The more context you give, the better Kira matches. Hard requirements are filters; soft ones are signals.
      </p>

      <div className="mt-10 space-y-6">
        <Field label="Job title">
          <TextInput
            value={req.title}
            onChange={(v) => setReq((r) => ({ ...r, title: v }))}
            placeholder="Senior Software Engineer"
          />
        </Field>

        <Field label="Job description URL" mono="optional — paste a link, we'll import it">
          <div className="space-y-2">
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md border border-hair" style={{ background: "var(--bg-elev-2)" }}>
                <Icon name="link" size={14} className="text-dim shrink-0" />
                <input
                  value={jdUrl}
                  onChange={(e) => { setJdUrl(e.target.value); setJdStatus("idle"); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleFetchJd(); }}
                  placeholder="greenhouse.io/jobs/… or careers.acme.com/…"
                  className="flex-1 text-[13px] font-mono placeholder:text-faint outline-none"
                  style={{ background: "transparent" }}
                />
              </div>
              <button
                onClick={handleFetchJd}
                disabled={!jdUrl.trim() || jdStatus === "fetching"}
                className="btn btn-accent disabled:opacity-40"
              >
                {jdStatus === "fetching" ? (
                  <><Icon name="spinner" size={12} />importing…</>
                ) : "import"}
              </button>
            </div>
            {jdStatus === "done" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md font-mono text-[11px]" style={{ background: "rgba(124,255,178,0.06)", border: "1px solid rgba(124,255,178,0.2)" }}>
                <Icon name="check" size={11} className="text-[#7cffb2]" />
                <span className="text-[#7cffb2]">JD imported and saved. Edit below if needed.</span>
              </div>
            )}
            {jdStatus === "error" && (
              <div className="px-3 py-2 rounded-md font-mono text-[11px] text-faint" style={{ background: "var(--bg-elev-2)" }}>
                Couldn't reach that URL. Paste the description manually below.
              </div>
            )}
          </div>
        </Field>

        <Field label="Role description" mono="what will this person build?">
          <TextArea
            value={req.description}
            onChange={(v) => setReq((r) => ({ ...r, description: v }))}
            placeholder="We're building the next generation of developer tooling. This role owns the core editor integration — you'll work across our Rust backend and TypeScript frontend…"
            rows={5}
          />
        </Field>

        <Field label="Must-have requirements" mono="hard filters">
          <TagInput
            tags={req.hardRequirements}
            onAdd={(v) => setReq((r) => ({ ...r, hardRequirements: [...r.hardRequirements, v] }))}
            onRemove={(i) => setReq((r) => ({ ...r, hardRequirements: r.hardRequirements.filter((_, j) => j !== i) }))}
            placeholder="e.g. 3+ yrs React, systems programming experience"
            accent
          />
        </Field>

        <Field label="Nice-to-have" mono="culture signals">
          <TagInput
            tags={req.softRequirements}
            onAdd={(v) => setReq((r) => ({ ...r, softRequirements: [...r.softRequirements, v] }))}
            onRemove={(i) => setReq((r) => ({ ...r, softRequirements: r.softRequirements.filter((_, j) => j !== i) }))}
            placeholder="e.g. startup experience, async-first, open source contributor"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <TextInput
              value={req.location}
              onChange={(v) => setReq((r) => ({ ...r, location: v }))}
              placeholder="San Francisco, CA"
            />
          </Field>
          <Field label="Remote">
            <div className="flex items-center h-[42px]">
              <button
                type="button"
                onClick={() => setReq((r) => ({ ...r, remote: !r.remote }))}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border font-mono text-[12px] transition-colors ${
                  req.remote
                    ? "border-[rgba(212,165,116,0.5)] text-accent"
                    : "border-hair text-faint"
                }`}
                style={{ background: req.remote ? "rgba(212,165,116,0.06)" : "var(--bg-elev-2)" }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-sm border flex items-center justify-center"
                  style={{ borderColor: req.remote ? "var(--accent)" : "var(--border)" }}
                >
                  {req.remote && <Icon name="check" size={9} className="text-accent" />}
                </div>
                remote-friendly
              </button>
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Comp min" mono="USD / yr">
            <input
              type="number"
              value={req.compMin || ""}
              onChange={(e) => setReq((r) => ({ ...r, compMin: Number(e.target.value) }))}
              placeholder="120000"
              className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] outline-none transition-colors"
              style={{ background: "var(--bg-elev-2)" }}
            />
          </Field>
          <Field label="Comp max" mono="USD / yr">
            <input
              type="number"
              value={req.compMax || ""}
              onChange={(e) => setReq((r) => ({ ...r, compMax: Number(e.target.value) }))}
              placeholder="180000"
              className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] outline-none transition-colors"
              style={{ background: "var(--bg-elev-2)" }}
            />
          </Field>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-hair-soft flex items-center justify-between">
        <button onClick={onBack} className="btn btn-ghost text-faint">
          <Icon name="back" size={12} />
          back
        </button>
        <button
          onClick={() => onNext(req)}
          disabled={!req.title.trim()}
          className="btn btn-accent disabled:opacity-40"
        >
          Continue
          <Icon name="arrow-right" size={12} />
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Documents ─────────────────────────────────────────────────────────

type DocItem = { file?: File; name: string; size: string; id: string };

function DocsStep({
  onBack,
  onSubmit,
  submitting,
}: {
  onBack: () => void;
  onSubmit: (files: File[]) => void;
  submitting: boolean;
}) {
  const [docs, setDocs] = React.useState<DocItem[]>([]);
  const [hover, setHover] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).map((f) => ({
      file: f,
      name: f.name,
      size: formatSize(f.size),
      id: `${f.name}-${Math.random()}`,
    }));
    setDocs((d) => [...d, ...arr]);
  }

  return (
    <div className="max-w-[680px] mx-auto px-8 pt-16 pb-12">
      <div className="font-mono text-[10.5px] text-accent uppercase tracking-wider mb-3">
        step 03 · documents
      </div>
      <h1 className="font-serif-h text-[40px] leading-tight tracking-tight mb-3">
        Drop in your context.
      </h1>
      <p className="font-serif-h text-[16px] text-dim leading-relaxed max-w-[520px]" style={{ fontWeight: 300 }}>
        Culture deck, full job description, team bios, investor decks. Kira reads these to match candidates who'll actually fit — not just check boxes.
      </p>

      <div
        onDragOver={(e) => { e.preventDefault(); setHover(true); }}
        onDragLeave={() => setHover(false)}
        onDrop={(e) => { e.preventDefault(); setHover(false); addFiles(e.dataTransfer.files); }}
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
          accept=".pdf,.md,.docx,.txt"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="px-8 py-12 flex flex-col items-center text-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
            style={{ background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.25)" }}
          >
            <Icon name="upload" size={18} className="text-accent" />
          </div>
          <div className="font-serif-h text-[18px]">Drag files here</div>
          <div className="font-mono text-[11px] text-faint mt-1.5">.pdf · .md · .docx · .txt</div>
          <button
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            className="btn mt-5"
          >
            <Icon name="plus" size={12} />
            browse files
          </button>
        </div>
      </div>

      {docs.length > 0 && (
        <div className="mt-6">
          <div className="font-mono text-[10.5px] text-faint uppercase tracking-wider mb-2">
            {docs.length} added
          </div>
          <div className="space-y-1.5">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-3 py-2 rounded-md border border-hair-soft bg-elev/30">
                <Icon name="doc" size={13} className="text-dim" />
                <span className="text-[12.5px] font-mono flex-1 truncate">{d.name}</span>
                <span className="font-mono text-[10.5px] text-faint">{d.size}</span>
                <button
                  onClick={() => setDocs((arr) => arr.filter((x) => x.id !== d.id))}
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
        <button onClick={onBack} className="btn btn-ghost text-faint">
          <Icon name="back" size={12} />
          back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSubmit([])}
            disabled={submitting}
            className="font-mono text-[11.5px] text-faint hover:text-dim disabled:opacity-40"
          >
            skip for now →
          </button>
          <button
            onClick={() => onSubmit(docs.map((d) => d.file!).filter(Boolean))}
            disabled={submitting}
            className="btn btn-accent disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Icon name="spinner" size={12} />
                posting role…
              </>
            ) : (
              <>
                Post role
                <Icon name="arrow-right" size={12} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [profile, setProfile] = React.useState<{ companyName: string; websiteUrl: string } | null>(null);
  const [requirements, setRequirements] = React.useState<Requirements | null>(null);

  const TOTAL_STEPS = 3;

  async function handleSubmit(files: File[]) {
    if (!requirements) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("requirements", JSON.stringify(requirements));

      const res = await fetch("/api/ingest/company", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post role");

      toast.success("Role posted — Kira is matching candidates now.");
      router.push("/company/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col" style={{ background: "var(--bg)" }}>
      <Header step={step} totalSteps={TOTAL_STEPS} />
      <div className="flex-1 overflow-auto">
        {step === 0 && (
          <ProfileStep
            onNext={(data) => {
              setProfile(data);
              setStep(1);
            }}
          />
        )}
        {step === 1 && (
          <RoleStep
            onBack={() => setStep(0)}
            onNext={(req) => {
              setRequirements(req);
              setStep(2);
            }}
          />
        )}
        {step === 2 && (
          <DocsStep
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}
