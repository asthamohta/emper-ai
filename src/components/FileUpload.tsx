"use client";

import { useState, useCallback } from "react";
import { Upload, X, FileText, CheckCircle2, Loader2 } from "lucide-react";

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
      const newFiles = Array.from(incoming).slice(0, maxFiles - files.length);
      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  async function handleUpload() {
    if (!files.length) return;
    setStatus("uploading");

    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setStatus("done");
      onUploadComplete(data.extractedContext ?? {});
    } catch {
      setStatus("error");
    }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
          dragOver
            ? "border-violet-400 bg-violet-50"
            : "border-gray-200 hover:border-violet-300 hover:bg-gray-50"
        }`}
        onClick={() => document.getElementById("emper-file-input")?.click()}
      >
        <input
          id="emper-file-input"
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
        <p className="text-xs text-gray-400 mt-1">PDF, TXT, DOCX, MD — up to {maxFiles} files</p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 border border-gray-100">
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
              </div>
              {status === "uploading" && <Loader2 className="w-4 h-4 text-violet-500 animate-spin shrink-0" />}
              {status === "done" && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
              {status === "idle" && (
                <button onClick={(e) => { e.stopPropagation(); removeFile(i); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && status === "idle" && (
        <button
          onClick={handleUpload}
          className="w-full py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          Upload {files.length} file{files.length > 1 ? "s" : ""}
        </button>
      )}

      {status === "uploading" && (
        <div className="flex items-center justify-center gap-2 text-sm text-violet-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing your documents…
        </div>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
          <CheckCircle2 className="w-4 h-4" />
          Documents processed — your context is ready
        </div>
      )}

      {status === "error" && (
        <div className="text-sm text-red-600">
          Upload failed.{" "}
          <button onClick={() => setStatus("idle")} className="underline">Try again</button>
        </div>
      )}
    </div>
  );
}
