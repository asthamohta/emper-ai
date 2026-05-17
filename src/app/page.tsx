import Link from "next/link";
import { ArrowRight, Sparkles, Shield, Brain, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-violet-600">
            emper
          </span>
          <div className="flex gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-50 text-violet-700 text-sm font-medium mb-8 border border-violet-100">
            <Sparkles className="w-3.5 h-3.5" />
            AI-powered matching that understands context
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-tight mb-6">
            Find your fit.{" "}
            <span className="text-violet-600">Not just a match.</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            Emper reads everything you've built — your resume, your writing, your goals —
            and matches you with companies based on who you actually are.
          </p>

          {/* Role cards */}
          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <Link href="/signup?role=candidate" className="group">
              <div className="relative p-8 rounded-2xl border-2 border-gray-100 hover:border-violet-200 bg-white hover:bg-violet-50/30 transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  I'm a candidate
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Upload your documents, share your goals, and get matched with roles that fit your actual ambitions.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 group-hover:gap-2.5 transition-all">
                  Get started <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>

            <Link href="/signup?role=company" className="group">
              <div className="relative p-8 rounded-2xl border-2 border-gray-100 hover:border-violet-200 bg-white hover:bg-violet-50/30 transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center mb-4">
                  <Brain className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  I'm hiring
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  Upload your JD and culture docs. Emper surfaces candidates who'll thrive — not just ones who pass keyword filters.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 group-hover:gap-2.5 transition-all">
                  Post a role <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            How Emper works
          </h2>
          <p className="text-center text-gray-500 mb-16">
            Built on the insight that people are more than their resume.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Build your context",
                description:
                  "Drop in your resume, LinkedIn, SOP — anything that represents you. Emper reads between the lines to understand how you think and work.",
              },
              {
                step: "02",
                title: "Share your goals",
                description:
                  "A short conversation about what you want next: the why, the culture, the comp. Not a form — a real dialogue.",
              },
              {
                step: "03",
                title: "Get real matches",
                description:
                  "Emper's AI combines vector search with deep reasoning to surface roles where you'll actually thrive — with explanations.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <span className="text-5xl font-bold text-violet-100 absolute -top-2 -left-2 select-none">
                  {item.step}
                </span>
                <div className="relative pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      <section className="py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-50 mb-6">
            <Shield className="w-6 h-6 text-violet-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Your documents are never shared
          </h2>
          <p className="text-gray-500">
            Your raw documents stay in your private vault. Companies only see what Emper's AI surfaces
            as match signals — never the underlying files.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-400">
          <span className="font-semibold text-violet-600">emper</span>
          <span>© 2025 Emper. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
