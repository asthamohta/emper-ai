"use client";

import { useState, useCallback } from "react";

interface FileUploadProps {
  onUploadComplete: (context: Record<string, string>) => void;
  endpoint: string;
  accept?: string;
  maxFiles?: number;
}

export default function FileUpload({
  onUploadComplete,
  endpoint,
  accept = ".pdf,.txt,.md,.docx",
  maxFiles = 10,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      setFiles((prev) => [...prev, ...Array.from(incoming).slice(0, maxFiles - prev.length)]);
    },
    [maxFiles]
  );

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleUpload() {
    if (!files.length) return;
    setStatus("uploading");
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    try {
      const res = await fetch(endpoint, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setStatus("done");
      onUploadComplete(data.extractedContext ?? {});
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById("emper-file-input")?.click()}
        className="relative rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors"
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--border)",
          background: dragOver ? "rgba(212,165,116,0.04)" : "transparent",
        }}
      >
        <input
          id="emper-file-input"
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="font-serif-h text-[16px] mb-1">Drop files here</div>
        <div className="font-mono text-[11px] text-faint">PDF · TXT · DOCX · MD — up to {maxFiles} files</div>
      </div>

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-md border border-hair-soft"
              style={{ background: "var(--bg-elev-2)" }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dim shrink-0">
                <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[12px] truncate">{file.name}</p>
                <p className="font-mono text-[10.5px] text-faint">{formatSize(file.size)}</p>
              </div>
              {status === "uploading" && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent animate-spin shrink-0">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {status === "done" && <span style={{ color: "var(--good)" }} className="font-mono text-[11px] shrink-0">✓</span>}
              {status === "idle" && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFiles((p) => p.filter((_, j) => j !== i)); }}
                  className="text-faint hover:text-[--text] shrink-0"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && status === "idle" && (
        <button onClick={handleUpload} className="btn btn-accent w-full justify-center py-2">
          Upload {files.length} file{files.length > 1 ? "s" : ""}
        </button>
      )}

      {status === "uploading" && (
        <div className="font-mono text-[11.5px] text-accent text-center py-1">
          Processing documents…
        </div>
      )}

      {status === "done" && (
        <div className="font-mono text-[11.5px] text-center py-1" style={{ color: "var(--good)" }}>
          ✓ Documents processed
        </div>
      )}

      {status === "error" && (
        <div className="font-mono text-[11.5px] text-center py-1" style={{ color: "#f87171" }}>
          Upload failed.{" "}
          <button onClick={() => setStatus("idle")} className="underline text-faint hover:text-dim">
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
