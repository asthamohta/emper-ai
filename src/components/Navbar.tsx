"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface NavbarProps {
  role: "candidate" | "company";
  name?: string;
}

export default function Navbar({ role, name }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    toast.success("Logged out");
  }

  return (
    <nav
      className="fixed top-0 w-full z-50 border-b border-hair-soft"
      style={{ background: "var(--bg-sidebar)", backdropFilter: "blur(8px)" }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-[5px] flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#d4a574,#8a6a47)" }}
            >
              <div className="w-1.5 h-1.5 rounded-[2px] bg-black/70" />
            </div>
            <span className="font-serif-h text-[15px] leading-none">emper</span>
            <span className="font-mono text-[10px] text-faint mt-1">/ai</span>
          </Link>
          <Link
            href={`/${role}/dashboard`}
            className="font-mono text-[11px] text-faint uppercase tracking-wider hover:text-dim transition-colors"
          >
            dashboard
          </Link>
        </div>
        <div className="flex items-center gap-4">
          {name && (
            <span className="font-mono text-[11.5px] text-faint">{name}</span>
          )}
          <button
            onClick={handleLogout}
            className="btn btn-ghost font-mono text-[11px] uppercase tracking-wider"
          >
            log out
          </button>
        </div>
      </div>
    </nav>
  );
}
