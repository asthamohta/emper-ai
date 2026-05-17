"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, ArrowRight, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Requirements {
  title: string;
  description: string;
  hardRequirements: string[];
  softRequirements: string[];
  location: string;
  remote: boolean;
  compMin: number;
  compMax: number;
}

const STEPS = [
  { id: 1, label: "Role details" },
  { id: 2, label: "Upload docs" },
];

export default function CompanyOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [hardInput, setHardInput] = useState("");
  const [softInput, setSoftInput] = useState("");

  const [req, setReq] = useState<Requirements>({
    title: "",
    description: "",
    hardRequirements: [],
    softRequirements: [],
    location: "",
    remote: false,
    compMin: 0,
    compMax: 0,
  });

  function addHard() {
    if (!hardInput.trim()) return;
    setReq((r) => ({ ...r, hardRequirements: [...r.hardRequirements, hardInput.trim()] }));
    setHardInput("");
  }

  function addSoft() {
    if (!softInput.trim()) return;
    setReq((r) => ({ ...r, softRequirements: [...r.softRequirements, softInput.trim()] }));
    setSoftInput("");
  }

  async function handleSubmit() {
    if (!req.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      formData.append("requirements", JSON.stringify(req));

      const res = await fetch("/api/ingest/company", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post role");

      toast.success("Role posted! Matching candidates now…");
      router.push("/company/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Post a role</h1>
          <p className="text-sm text-gray-500">
            Give Emper as much context as possible for better candidate matching.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold shrink-0 transition-all ${
                  step === s.id
                    ? "bg-violet-600 text-white"
                    : step > s.id
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s.id ? "✓" : s.id}
              </div>
              <span className={`text-sm font-medium ${step === s.id ? "text-gray-900" : "text-gray-400"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px ${step > s.id ? "bg-emerald-300" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Role details */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border p-6 shadow-sm space-y-5 animate-fade-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Job title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={req.title}
                onChange={(e) => setReq((r) => ({ ...r, title: e.target.value }))}
                placeholder="e.g. Senior Software Engineer"
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Role description
              </label>
              <textarea
                value={req.description}
                onChange={(e) => setReq((r) => ({ ...r, description: e.target.value }))}
                placeholder="What will this person be doing? What problems will they solve?"
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {/* Hard requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Must-have requirements
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={hardInput}
                  onChange={(e) => setHardInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHard())}
                  placeholder="e.g. 3+ years React"
                  className="flex-1 px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={addHard}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {req.hardRequirements.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-xs font-medium"
                  >
                    {r}
                    <button onClick={() => setReq((prev) => ({ ...prev, hardRequirements: prev.hardRequirements.filter((_, j) => j !== i) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Soft requirements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nice-to-have / culture signals
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={softInput}
                  onChange={(e) => setSoftInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSoft())}
                  placeholder="e.g. startup experience, async-first"
                  className="flex-1 px-3.5 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  onClick={addSoft}
                  className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {req.softRequirements.map((r, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-xs font-medium"
                  >
                    {r}
                    <button onClick={() => setReq((prev) => ({ ...prev, softRequirements: prev.softRequirements.filter((_, j) => j !== i) }))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Location / comp */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Location
                </label>
                <input
                  value={req.location}
                  onChange={(e) => setReq((r) => ({ ...r, location: e.target.value }))}
                  placeholder="San Francisco, CA"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={req.remote}
                    onChange={(e) => setReq((r) => ({ ...r, remote: e.target.checked }))}
                    className="w-4 h-4 accent-violet-600"
                  />
                  Remote-friendly
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Comp min (USD/yr)
                </label>
                <input
                  type="number"
                  value={req.compMin || ""}
                  onChange={(e) => setReq((r) => ({ ...r, compMin: Number(e.target.value) }))}
                  placeholder="120000"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Comp max (USD/yr)
                </label>
                <input
                  type="number"
                  value={req.compMax || ""}
                  onChange={(e) => setReq((r) => ({ ...r, compMax: Number(e.target.value) }))}
                  placeholder="180000"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!req.title.trim()}
              className="w-full py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Upload docs */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border p-6 shadow-sm animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Upload company documents
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Culture deck, full JD, team bios — the more context, the better the matching.
              All optional.
            </p>

            {/* Drop zone */}
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-violet-300 hover:bg-gray-50 transition-all mb-4"
              onClick={() => document.getElementById("company-file-input")?.click()}
            >
              <input
                id="company-file-input"
                type="file"
                multiple
                accept=".pdf,.txt,.md,.docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) setFiles(Array.from(e.target.files));
                }}
              />
              <FileText className="w-7 h-7 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Drop files or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, MD</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-2 mb-4">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600 px-3 py-2 bg-gray-50 rounded-lg border">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}>
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? "Processing…" : "Post this role"}
            </button>

            <button
              onClick={() => setStep(1)}
              className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Back to role details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
