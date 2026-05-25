"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import ChatInterface from "@/components/ChatInterface";
import { Shield, MessageSquare, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Your document vault", icon: FileText },
  { id: 2, label: "Your goals", icon: MessageSquare },
];

export default function CandidateOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [githubHandle, setGithubHandle] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [paperUrl, setPaperUrl] = useState("");
  const [githubStatus, setGithubStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [websiteStatus, setWebsiteStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [portfolioStatus, setPortfolioStatus] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [paperStatus, setPaperStatus] = useState<"idle" | "processing" | "done" | "error">("idle");

  function handleDocsComplete(context: Record<string, string>) {
    setDocsUploaded(true);
    if (Object.keys(context).length > 0) {
      toast.success("Documents processed — we understand your background now.");
    }
  }

  async function handleGithubIngest() {
    if (!githubHandle.trim()) return;
    setGithubStatus("processing");
    try {
      const res = await fetch("/api/ingest/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername: githubHandle }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "GitHub ingestion failed");
      }
      setDocsUploaded(true);
      setGithubStatus("done");
      toast.success(`GitHub profile ${data.githubUsername} ingested successfully`);
      setGithubHandle("");
    } catch (error) {
      console.error(error);
      setGithubStatus("error");
      toast.error("Unable to ingest GitHub profile. Check the username and try again.");
    }
  }

  async function handleSourceIngest(
    sourceType: "website" | "portfolio" | "paper",
    url: string,
    setStatus: (value: "idle" | "processing" | "done" | "error") => void,
    resetUrl: () => void
  ) {
    if (!url.trim()) return;
    setStatus("processing");
    try {
      const res = await fetch("/api/ingest/source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceType, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `${sourceType} ingestion failed`);
      }
      setDocsUploaded(true);
      setStatus("done");
      toast.success(`${sourceType.charAt(0).toUpperCase() + sourceType.slice(1)} ingested successfully`);
      resetUrl();
    } catch (error) {
      console.error(error);
      setStatus("error");
      toast.error(`Unable to ingest ${sourceType}. Check the URL and try again.`);
    }
  }

  async function handleGoalsComplete(goals: Record<string, string>) {
    toast.success("All set! Finding your matches…");
    // Trigger match computation in background
    fetch("/api/match/run", { method: "POST" }).catch(() => {});
    router.push("/candidate/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Let&apos;s build your profile
          </h1>
          <p className="text-gray-500 text-sm">
            Two quick steps and Emper will start finding your matches.
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
              <span
                className={`text-sm font-medium transition-colors ${
                  step === s.id ? "text-gray-900" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px transition-colors ${
                    step > s.id ? "bg-emerald-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Document upload */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border p-6 shadow-sm animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Your document vault
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Drop in anything that represents you — resume, LinkedIn PDF, SOP, writing
              samples. More context = better matches.
            </p>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-violet-50 border border-violet-100 mb-5">
              <Shield className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
              <p className="text-xs text-violet-700">
                Your documents are private and never shared. Only the extracted signals are
                used for matching.
              </p>
            </div>

            <FileUpload
              endpoint="/api/ingest/candidate"
              onUploadComplete={handleDocsComplete}
            />

            <div className="mt-6 rounded-2xl border border-gray-200 p-4 bg-gray-50 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  GitHub profile (optional)
                </label>
                <div className="flex gap-2">
                  <input
                    value={githubHandle}
                    onChange={(e) => setGithubHandle(e.target.value)}
                    placeholder="github.com/yourname or yourname"
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  />
                  <button
                    onClick={handleGithubIngest}
                    disabled={githubStatus === "processing"}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {githubStatus === "processing" ? "Processing…" : "Ingest GitHub"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Capture a small set of representative GitHub artifacts as markdown evidence.
                </p>
                {githubStatus === "done" && (
                  <p className="mt-2 text-xs text-emerald-600">GitHub evidence ingested successfully.</p>
                )}
                {githubStatus === "error" && (
                  <p className="mt-2 text-xs text-red-600">Could not ingest GitHub profile.</p>
                )}
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Personal website (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder="https://yourname.com"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                    <button
                      onClick={() => handleSourceIngest("website", websiteUrl, setWebsiteStatus, () => setWebsiteUrl(""))}
                      disabled={websiteStatus === "processing"}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {websiteStatus === "processing" ? "Processing…" : "Ingest website"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Scrape page metadata and text from your website.
                  </p>
                  {websiteStatus === "done" && (
                    <p className="mt-2 text-xs text-emerald-600">Website evidence ingested successfully.</p>
                  )}
                  {websiteStatus === "error" && (
                    <p className="mt-2 text-xs text-red-600">Could not ingest website.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Portfolio / project page (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://www.behance.net/yourname"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                    <button
                      onClick={() => handleSourceIngest("portfolio", portfolioUrl, setPortfolioStatus, () => setPortfolioUrl(""))}
                      disabled={portfolioStatus === "processing"}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {portfolioStatus === "processing" ? "Processing…" : "Ingest portfolio"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Scrape a project walkthrough or portfolio page as evidence.
                  </p>
                  {portfolioStatus === "done" && (
                    <p className="mt-2 text-xs text-emerald-600">Portfolio evidence ingested successfully.</p>
                  )}
                  {portfolioStatus === "error" && (
                    <p className="mt-2 text-xs text-red-600">Could not ingest portfolio page.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Research paper / publication page (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={paperUrl}
                      onChange={(e) => setPaperUrl(e.target.value)}
                      placeholder="https://arxiv.org/abs/1234.5678"
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                    />
                    <button
                      onClick={() => handleSourceIngest("paper", paperUrl, setPaperStatus, () => setPaperUrl(""))}
                      disabled={paperStatus === "processing"}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {paperStatus === "processing" ? "Processing…" : "Ingest paper"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Scrape academic or publication pages to capture title, authors, and abstract.
                  </p>
                  {paperStatus === "done" && (
                    <p className="mt-2 text-xs text-emerald-600">Paper evidence ingested successfully.</p>
                  )}
                  {paperStatus === "error" && (
                    <p className="mt-2 text-xs text-red-600">Could not ingest paper page.</p>
                  )}
                </div>
              </div>
            </div>

            {docsUploaded && (
              <button
                onClick={() => setStep(2)}
                className="mt-6 w-full py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
              >
                Continue to goals <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {!docsUploaded && (
              <button
                onClick={() => setStep(2)}
                className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 underline transition-colors"
              >
                Skip for now — add documents later
              </button>
            )}
          </div>
        )}

        {/* Step 2: Goals chat */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border p-6 shadow-sm animate-fade-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Tell us what you want
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              A short conversation with our AI guide. No forms — just talk. This helps
              Emper match you on goals and culture, not just skills.
            </p>

            <ChatInterface onComplete={handleGoalsComplete} />
          </div>
        )}
      </div>
    </div>
  );
}
