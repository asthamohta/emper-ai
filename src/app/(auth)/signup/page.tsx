"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as "candidate" | "company") ?? "candidate";

  const [role, setRole] = useState<"candidate" | "company">(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Signup failed");
        return;
      }
      router.push(`/${role}/onboarding`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <Link href="/" className="flex items-center gap-2 mb-10">
        <div
          className="w-5 h-5 rounded-[5px] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#d4a574,#8a6a47)" }}
        >
          <div className="w-1.5 h-1.5 rounded-[2px] bg-black/70" />
        </div>
        <span className="font-serif-h text-[17px] leading-none">emper</span>
        <span className="font-mono text-[10px] text-faint mt-1">/ai</span>
      </Link>

      <div className="w-full max-w-sm card p-8">
        <h1 className="font-serif-h text-[26px] leading-tight mb-1">Create your account</h1>
        <p className="font-mono text-[11.5px] text-faint mb-7">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>

        {/* Role toggle */}
        <div
          className="flex rounded-md p-0.5 mb-6 border border-hair"
          style={{ background: "var(--bg-elev-2)" }}
        >
          {(["candidate", "company"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`flex-1 py-1.5 font-mono text-[11.5px] rounded transition-all ${
                role === r
                  ? "btn-accent"
                  : "text-faint hover:text-dim"
              }`}
            >
              {r === "candidate" ? "candidate" : "hiring"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[10.5px] text-dim uppercase tracking-wider mb-1.5">
              {role === "candidate" ? "Your name" : "Company name"}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === "candidate" ? "Alex Chen" : "Acme Corp"}
              required
              className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] focus:ring-0 transition-colors"
              style={{ background: "var(--bg-elev-2)" }}
            />
          </div>
          <div>
            <label className="block font-mono text-[10.5px] text-dim uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] focus:ring-0 transition-colors"
              style={{ background: "var(--bg-elev-2)" }}
            />
          </div>
          <div>
            <label className="block font-mono text-[10.5px] text-dim uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8+ characters"
              minLength={8}
              required
              className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] focus:ring-0 transition-colors"
              style={{ background: "var(--bg-elev-2)" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent w-full justify-center py-2.5 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
