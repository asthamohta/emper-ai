"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

function Logo() {
  return (
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
  );
}

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  minLength,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block font-mono text-[10.5px] text-dim uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        minLength={minLength}
        className="w-full px-3 py-2.5 rounded-md border border-hair text-[13px] font-mono placeholder:text-faint focus:border-[rgba(212,165,116,0.5)] focus:ring-0 outline-none transition-colors"
        style={{ background: "var(--bg-elev-2)" }}
      />
    </div>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = (searchParams.get("role") as "candidate" | "company") ?? null;

  const [role, setRole] = useState<"candidate" | "company" | null>(defaultRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
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
      <Logo />

      {/* Path selection */}
      {!role ? (
        <div className="w-full max-w-md">
          <h1 className="font-serif-h text-[32px] leading-tight tracking-tight mb-2 text-center">
            Who are you?
          </h1>
          <p className="font-mono text-[11.5px] text-faint text-center mb-8">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setRole("candidate")}
              className="card p-6 text-left hover:border-[rgba(212,165,116,0.4)] transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center mb-4"
                style={{ background: "rgba(212,165,116,0.1)", border: "1px solid rgba(212,165,116,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
                </svg>
              </div>
              <div className="font-serif-h text-[18px] mb-1">Candidate</div>
              <div className="font-mono text-[11px] text-faint leading-relaxed">
                I&apos;m looking for my next role. Build my profile and get matched.
              </div>
            </button>

            <button
              onClick={() => setRole("company")}
              className="card p-6 text-left hover:border-[rgba(212,165,116,0.4)] transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center mb-4"
                style={{ background: "rgba(212,165,116,0.1)", border: "1px solid rgba(212,165,116,0.2)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
                  <line x1="12" y1="12" x2="12" y2="16" />
                  <line x1="10" y1="14" x2="14" y2="14" />
                </svg>
              </div>
              <div className="font-serif-h text-[18px] mb-1">Company</div>
              <div className="font-mono text-[11px] text-faint leading-relaxed">
                I&apos;m hiring. Post a role and find matched candidates.
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-sm card p-8">
          <button
            onClick={() => setRole(null)}
            className="flex items-center gap-1.5 font-mono text-[10.5px] text-faint hover:text-dim mb-5 -ml-0.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            back
          </button>

          <h1 className="font-serif-h text-[26px] leading-tight mb-1">
            {role === "candidate" ? "Create your profile" : "Set up your company"}
          </h1>
          <p className="font-mono text-[11.5px] text-faint mb-7">
            Already have an account?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Log in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label={role === "candidate" ? "Your name" : "Company name"}
              type="text"
              value={name}
              onChange={setName}
              placeholder={role === "candidate" ? "Alex Chen" : "Acme Corp"}
            />
            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder={role === "candidate" ? "you@example.com" : "hiring@company.com"}
            />
            <InputField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="8+ characters"
              minLength={8}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent w-full justify-center py-2.5 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Continue"}
            </button>
          </form>
        </div>
      )}
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
