"""Hand-crafted role/company data for local testing.

All three roles are AI-native startups, picked for meaningful contrast:
  - r_001 Modal Labs        — pure ML infra (founding ML eng energy, small team)
  - r_002 Cursor (Anysphere)— AI product company at scale-up stage
  - r_003 Perplexity        — applied AI research/retrieval at a growing product co

Numbers (headcount, funding, comp) are best-effort approximations from public
sources as of 2025 — they're plausible enough for the agent layer to reason
over, but should be verified before any go-to-market use.
"""

from typing import Optional

ROLES: list[dict] = [
    {
        "role_id": "r_001",
        "company": {
            "name": "Modal Labs",
            "stage": "Series B",
            "size": "~80 people",
            "funding_total": "~$80M (Series A led by Redpoint, Series B led by Lux Capital)",
            "investors": ["Redpoint", "Lux Capital", "Amplify Partners"],
            "mission": "Run any Python code in the cloud with zero config — serverless GPU + CPU infrastructure for AI builders.",
            "culture_notes": (
                "Small, eng-driven, founder-led (CEO Erik Bernhardsson, ex-Spotify ML). "
                "Ships multiple times per day. Async + remote-friendly with NYC office "
                "and SF presence. Engineering blog is taken seriously — writing is part "
                "of the job. Everyone on call. Strong opinions about Python ergonomics."
            ),
            "website": "modal.com",
        },
        "role": {
            "title": "Founding ML Infrastructure Engineer",
            "description": (
                "Own a slice of Modal's GPU runtime end-to-end: container orchestration, "
                "the serverless function lifecycle, inference latency, and the SDK that "
                "millions of devs (will) use to spin up GPUs. You'll work directly with "
                "the founders and own a P0 system from week one."
            ),
            "hard_requirements": [
                "4+ years systems / infrastructure engineering",
                "Production experience with one of: container runtimes, distributed systems, GPU scheduling",
                "Strong Python and at least one of Go / Rust / C++",
                "NYC (HQ) or SF (in-office 3+ days/wk)",
            ],
            "soft_requirements": [
                "Has shipped open-source infra projects",
                "Writes clearly (engineering blog contributions welcome)",
                "Comfortable owning systems that other engineers depend on",
                "Has worked at a sub-100 person company before",
            ],
            "comp_band": {
                "base_min": 200000,
                "base_max": 280000,
                "equity_pct_min": 0.15,
                "equity_pct_max": 0.6,
            },
            "location": "NYC HQ (3+ days in-office) or SF",
            "deal_breakers": [
                "Looking for big-company stability",
                "Pure research focus with no shipping",
                "Won't be on-call for prod",
                "Fully remote outside US time zones",
            ],
            "anti_fit_signals": [
                "Optimizing primarily for title or stability",
                "Needs strict 9-5 boundaries (this is a 50+ hour startup)",
                "Hasn't built systems that survive real traffic",
                "Wants only-research, no-product work",
            ],
        },
    },
    {
        "role_id": "r_002",
        "company": {
            "name": "Cursor (Anysphere)",
            "stage": "Series B+ (rapidly scaling)",
            "size": "~80 people (growing fast)",
            "funding_total": "~$170M+ (Andreessen Horowitz, Thrive, OpenAI Startup Fund, Stripe founders)",
            "investors": ["a16z", "Thrive Capital", "OpenAI Startup Fund"],
            "mission": "Build the AI-powered code editor. Make programming 10x more productive.",
            "culture_notes": (
                "SF in-office is strong cultural preference (founders + most eng in-office). "
                "Insanely high bar — every hire is closed by the founders. "
                "Ships features daily; the editor's Tab/agent loops are tuned constantly. "
                "Eng-led, opinionated about latency and UX polish. Performance and craft "
                "obsessed. No middle management — flat IC ladder."
            ),
            "website": "cursor.com",
        },
        "role": {
            "title": "Senior Product Engineer",
            "description": (
                "Build core user-facing surfaces in the editor — Tab autocomplete, the "
                "agent panel, multi-file edits, indexing. You'll work across our "
                "Electron + TypeScript frontend and Python/Rust backends. Performance "
                "and feel matter as much as correctness."
            ),
            "hard_requirements": [
                "5+ years full-stack experience, with deep TypeScript",
                "Has shipped a customer-facing product that users actively complain about (signal of scale)",
                "Comfortable with native/Electron-level performance work",
                "SF Bay Area, in-office (4+ days/wk)",
            ],
            "soft_requirements": [
                "Cares about craft, latency, and polish",
                "Has opinions about IDE / dev-tool UX",
                "Comfortable with monolith-ish codebases that move fast",
                "Has worked at < 100 person company before",
            ],
            "comp_band": {
                "base_min": 220000,
                "base_max": 320000,
                "equity_pct_min": 0.05,
                "equity_pct_max": 0.30,
            },
            "location": "SF Bay Area (in-office 4+ days/wk)",
            "deal_breakers": [
                "Remote-only",
                "Wants infra-only or research-only work",
                "Heavy design-doc culture preferred",
                "Strict work-life balance requirements",
            ],
            "anti_fit_signals": [
                "Optimizing for pure technical depth over user empathy",
                "Wants founding-stage scope (we're past that)",
                "Prefers slow, deliberate, doc-driven processes",
                "Has not used Cursor seriously",
            ],
        },
    },
    {
        "role_id": "r_003",
        "company": {
            "name": "Perplexity",
            "stage": "Series C / late-stage",
            "size": "~200 people",
            "funding_total": "~$500M+ across rounds (IVP, NEA, Bezos, NVIDIA, others)",
            "investors": ["IVP", "NEA", "Bezos Expeditions", "NVIDIA"],
            "mission": "Build the world's most trusted AI-powered answer engine.",
            "culture_notes": (
                "Hybrid SF (HQ, 3 days in-office) with a smaller remote tail. Research and "
                "product engineering live close together — applied research is expected to "
                "ship to prod, not sit in papers. Strong on retrieval, RAG, and search-quality "
                "metrics. Weekly model + retrieval ablations are normal. CTO and founding "
                "team are deeply technical."
            ),
            "website": "perplexity.ai",
        },
        "role": {
            "title": "Applied AI Research Engineer, Retrieval & Search Quality",
            "description": (
                "Improve answer quality through better retrieval, re-ranking, and grounding. "
                "You'll design experiments, train and evaluate retrieval models, and ship "
                "improvements that move our search quality metrics in production. Half "
                "research mindset, half production engineer."
            ),
            "hard_requirements": [
                "3+ years ML engineering with PyTorch in production",
                "Has shipped models that serve real users (not only research code)",
                "Strong on retrieval / search / embeddings / RAG",
                "SF Bay Area or willing to relocate (3 days in-office)",
            ],
            "soft_requirements": [
                "Co-authored ML papers at top venues (NeurIPS / ICLR / ACL / SIGIR) preferred",
                "Cares about both offline metrics AND end-user answer quality",
                "Comfortable reading and reproducing recent search/retrieval papers",
                "Has run online A/B experiments on a production model",
            ],
            "comp_band": {
                "base_min": 230000,
                "base_max": 330000,
                "equity_pct_min": 0.02,
                "equity_pct_max": 0.10,
            },
            "location": "SF Bay Area (hybrid, 3 days in-office)",
            "deal_breakers": [
                "Wants pure research with no shipping",
                "Wants founding-stage scope or full-stack product work",
                "Cannot relocate to the Bay Area",
            ],
            "anti_fit_signals": [
                "Optimizing primarily for publication count over product impact",
                "Wants pure infra/platform work with no model involvement",
                "Looking for early-stage scrappy ownership across the whole product",
            ],
        },
    },
]

_BY_ID = {r["role_id"]: r for r in ROLES}
ALL = ROLES


def get_by_id(role_id: str) -> Optional[dict]:
    return _BY_ID.get(role_id)
