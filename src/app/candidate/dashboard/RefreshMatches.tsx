"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RefreshMatches() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await fetch("/api/match/run", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(
        data.matchesComputed > 0
          ? `Computed ${data.matchesComputed} match${data.matchesComputed > 1 ? "es" : ""}`
          : "No new matches — check back as more roles are posted"
      );
      router.refresh();
    } catch {
      toast.error("Failed to compute matches");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={run}
      disabled={loading}
      className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <RefreshCw className="w-3.5 h-3.5" />
      )}
      {loading ? "Finding matches…" : "Refresh matches"}
    </button>
  );
}
