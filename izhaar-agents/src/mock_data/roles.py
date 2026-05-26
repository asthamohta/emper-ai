"""Hand-crafted role/company data for local testing."""

from typing import Optional

ROLES: list[dict] = [
    {
        "role_id": "r_001",
        "company": {
            "name": "Caldera AI",
            "stage": "Series A",
            "size": "23 people",
            "funding_total": "$18M",
            "investors": ["Founders Fund", "Conviction"],
            "mission": "Make AI inference 10x cheaper for AI-first startups",
            "culture_notes": (
                "Async-first. Small team. Eng-led. Comfortable with ambiguity. "
                "We ship to prod multiple times per week. On-call rotates across "
                "the whole eng team — no separate SRE."
            ),
            "website": "caldera.ai",
        },
        "role": {
            "title": "Founding ML Engineer",
            "description": (
                "We're building the next-gen inference layer for AI-first startups. "
                "You'll own our quantization and serving stack end-to-end — from CUDA "
                "kernels to the customer-facing API. Reporting directly to the CTO."
            ),
            "hard_requirements": [
                "3+ years ML infrastructure experience",
                "Production experience with inference systems (vLLM, TensorRT, or equivalent)",
                "Comfortable with CUDA or willing to learn fast",
                "Bay Area or willing to relocate within 60 days",
            ],
            "soft_requirements": [
                "Self-directed",
                "Has shipped open-source ML infra projects",
                "Strong writing / can explain technical decisions",
                "Has worked at a startup before",
            ],
            "comp_band": {
                "base_min": 200000,
                "base_max": 280000,
                "equity_pct_min": 0.4,
                "equity_pct_max": 1.2,
            },
            "location": "Bay Area (SF, in-office 3 days/wk)",
            "deal_breakers": [
                "Looking for big-company stability",
                "Pure research focus with no shipping",
                "Doesn't want to be on-call for prod issues",
            ],
            "anti_fit_signals": [
                "Wants pure research role",
                "Needs strict 9-5 boundaries (this is a 50+ hour startup)",
                "Hasn't built systems that handle real traffic",
                "Optimizing primarily for title/stability vs ownership",
            ],
        },
    },
    {
        "role_id": "r_002",
        "company": {
            "name": "Loom Health",
            "stage": "Series B",
            "size": "48 people",
            "funding_total": "$52M",
            "investors": ["a16z", "GV"],
            "mission": "AI-driven clinical documentation for primary care clinics",
            "culture_notes": (
                "Hybrid (NYC HQ, 2 days in-office for NYC team, remote OK elsewhere). "
                "Product-led — eng works closely with clinicians. We are deliberate "
                "and write a lot of design docs before shipping. HIPAA-compliant culture."
            ),
            "website": "loomhealth.com",
        },
        "role": {
            "title": "Senior Full-Stack Engineer",
            "description": (
                "Own a full vertical slice of our clinician-facing app. You'll work "
                "across Next.js + Postgres + a Python AI service, and you'll talk "
                "to actual doctors weekly to understand their workflows."
            ),
            "hard_requirements": [
                "5+ years full-stack experience",
                "Production TypeScript + a backend language (Python or Go preferred)",
                "Has shipped a customer-facing product end-to-end",
            ],
            "soft_requirements": [
                "Comfortable talking to non-technical users (clinicians)",
                "Cares about correctness — we're in healthcare",
                "Has worked at a Series B-stage company before",
            ],
            "comp_band": {
                "base_min": 180000,
                "base_max": 240000,
                "equity_pct_min": 0.05,
                "equity_pct_max": 0.20,
            },
            "location": "NYC (hybrid, 2 days in-office) or remote US-only",
            "deal_breakers": [
                "Needs to be fully remote outside US time zones",
                "Wants to work on infra-only",
                "Uncomfortable with regulated environments",
            ],
            "anti_fit_signals": [
                "Wants founding/pre-seed scope (we're past that)",
                "Optimizing for pure technical depth over user empathy",
                "Doesn't want to write design docs",
            ],
        },
    },
    {
        "role_id": "r_003",
        "company": {
            "name": "Helion Labs",
            "stage": "Series C / Frontier lab",
            "size": "190 people",
            "funding_total": "$420M",
            "investors": ["Sequoia", "Index"],
            "mission": "Build safe and capable foundation models",
            "culture_notes": (
                "Research-driven. Publication-friendly (with safety review). Long-horizon "
                "projects measured in months, not weeks. Strong internal seminar culture. "
                "On-site in SF with 4 days/wk expected."
            ),
            "website": "helion.ai",
        },
        "role": {
            "title": "Research Engineer, Alignment",
            "description": (
                "Join the alignment team to design and run experiments that probe "
                "and improve the behavior of frontier models. You'll work closely "
                "with research scientists and own infra + experiment design for "
                "a research agenda."
            ),
            "hard_requirements": [
                "Strong ML engineering — comfortable with PyTorch and distributed training",
                "Has co-authored at least one ML paper at a top venue (NeurIPS / ICML / ICLR / ACL)",
                "Comfortable with long-horizon (3-6 month) research projects",
                "On-site SF 4 days/wk",
            ],
            "soft_requirements": [
                "Genuine interest in alignment / safety as a research problem",
                "Can communicate findings clearly (talks, writeups)",
                "Comfortable with research code shipping to internal infra (not customers)",
            ],
            "comp_band": {
                "base_min": 260000,
                "base_max": 340000,
                "equity_pct_min": 0.03,
                "equity_pct_max": 0.12,
            },
            "location": "SF (on-site 4 days/wk)",
            "deal_breakers": [
                "Wants customer-facing product work",
                "Needs to ship to prod weekly",
                "Not willing to be on-site",
            ],
            "anti_fit_signals": [
                "Optimizing for startup scope/ownership over research depth",
                "Looking primarily for infra cost optimization work",
                "Wants founding-engineer-style breadth",
            ],
        },
    },
]

_BY_ID = {r["role_id"]: r for r in ROLES}
ALL = ROLES


def get_by_id(role_id: str) -> Optional[dict]:
    return _BY_ID.get(role_id)
