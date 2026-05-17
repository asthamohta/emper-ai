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

  function handleDocsComplete(context: Record<string, string>) {
    setDocsUploaded(true);
    if (Object.keys(context).length > 0) {
      toast.success("Documents processed — we understand your background now.");
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
