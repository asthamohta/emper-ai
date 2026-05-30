"""Hand-crafted candidate scraper outputs for local testing.

Per the multi-source spec, the input to ``build_candidate_persona`` is:

    {
      "candidate_id": "c_001",
      "name": "Maya Chen",
      "sources": {
        "scraper": {
          "resume": {...}, "github": {...}, "linkedin": {...},
          "portfolio": {...}, "huggingface": {...}, "google_form": {...}
        },
        "ai_chat_history": {
          "provider": "claude" | "chatgpt" | "gemini" | "grok",
          "submitted_at": "ISO timestamp",
          "raw_output": "the 13-section behavioral profile pasted in"
        }
      }
    }

Either side of ``sources`` may be omitted. To exercise the merge path,
``c_001`` (Maya) has both scraper and chat-history sources; the others
have only scraper data.
"""

from typing import Optional

# ─── Sample ai_chat_history.raw_output for Maya ──────────────────────────────
# This is a synthetic "13-section behavioral profile" — the kind of output the
# candidate would paste in after asking another AI to summarize their chat
# history. Identifying material is deliberately absent so we can also exercise
# the privacy-stripping prompt without a real PII leak.
_MAYA_CHAT_HISTORY = """\
Behavioral profile based on past conversations.

1. Working style
The user works in long, focused sessions, usually starting from a small,
testable hypothesis and instrumenting before changing anything. They are
uncomfortable shipping code they don't have a benchmark for.

2. Decision-making
Decisions are anchored in measurable evidence. The user routinely runs A/B
comparisons (sometimes against their own previous version) before committing
to an approach. They are willing to throw away two weeks of work if a
benchmark proves it was the wrong direction.

3. Communication
Direct, terse, willing to disagree in writing. The user tends to ask one
sharp question rather than three vague ones. They draft and rewrite messages
to remove softening language.

4. Collaboration
Prefers small teams. The user has expressed discomfort when more than ~5
engineers are on the same code path; they have said "I lose context on what
my changes will break." Comfortable with async / writing-first collaboration.

5. Professional goals
Wants to own a critical system end-to-end. Has said they don't want a manager
role anytime soon. Optimizing for ownership and learning over title.

6. Technical interests
Inference infrastructure, GPU kernels, low-level optimization. The user is
specifically interested in the boundary between research and production —
making research artifacts shippable.

7. Growth areas
Not enough signal.

8. What they're allergic to
Vague mandates. The user has multiple times surfaced frustration with
"strategy" discussions that don't end in a measurable next step. Also dislikes
work where they cannot directly observe the impact of what they shipped.

9. How they handle conflict
Calmly. The user tends to restate the other person's position in their own
words before responding, and will concede when shown evidence. They get
frustrated when conflict is about opinions and the other side won't commit
to a measurable comparison.

10. Risk tolerance
High for technical risk (will try a new approach with no precedent if the
upside is clear). Lower for organizational risk — has expressed wariness of
joining places with unclear ownership lines.

11. Energy patterns
Strong evening and night energy. Most substantive technical writing happens
between 9pm and 2am.

12. Dealbreakers
Not enough signal in the past conversations to extract additional
dealbreakers beyond what is already on the user's structured form.

13. Sensitive topics
Insufficient data — skipping per privacy rules.
"""


CANDIDATES: list[dict] = [
    {
        "candidate_id": "c_001",
        "name": "Maya Chen",
        "sources": {
            "scraper": {
                "github": {
                    "username": "mayachen",
                    "top_repos": [
                        {
                            "name": "vllm-quantization",
                            "stars": 847,
                            "languages": ["Python", "CUDA"],
                            "description": "8-bit quantization for vLLM inference servers",
                            "commits_last_90_days": 142,
                        },
                        {
                            "name": "transformer-from-scratch",
                            "stars": 234,
                            "languages": ["Python"],
                            "description": "Educational implementation of GPT-2 from scratch with annotated forward/backward pass",
                            "commits_last_90_days": 18,
                        },
                        {
                            "name": "inference-bench",
                            "stars": 91,
                            "languages": ["Python", "C++"],
                            "description": "Microbenchmark suite for LLM inference servers — measures tokens/sec and tail latency",
                            "commits_last_90_days": 31,
                        },
                    ],
                    "commit_pattern": "consistent_weekly_18_months",
                    "languages_by_volume": {
                        "Python": 0.65,
                        "CUDA": 0.18,
                        "C++": 0.12,
                        "TypeScript": 0.05,
                    },
                    "total_public_repos": 27,
                    "followers": 412,
                },
                "linkedin": {
                    "current_role": "ML Engineer at Foundry (Series A inference startup)",
                    "current_tenure_months": 14,
                    "previous_roles": [
                        {
                            "company": "Stripe",
                            "role": "Software Engineer",
                            "duration_months": 28,
                            "description": "Worked on payment ML risk models. Shipped a real-time fraud scoring service handling 30k QPS.",
                        },
                    ],
                    "education": [
                        {"school": "Stanford", "degree": "MS Computer Science", "year": 2023, "focus": "ML systems"},
                        {"school": "UIUC", "degree": "BS Computer Engineering", "year": 2021},
                    ],
                },
                "portfolio": {
                    "url": "mayachen.dev",
                    "highlighted_projects": [
                        {
                            "title": "Why I chose CUDA over Triton for our inference layer",
                            "type": "blog_post",
                            "url": "mayachen.dev/cuda-vs-triton",
                            "excerpt": "After three weeks benchmarking both, I picked CUDA for the long tail of optimizations we needed. Here's the data.",
                        },
                        {
                            "title": "vllm-quantization: a postmortem",
                            "type": "blog_post",
                            "url": "mayachen.dev/vllm-quantization-postmortem",
                        },
                    ],
                },
                "google_form": {
                    "compensation_expectations": "$220-280k base, prefer equity-weighted at Series A",
                    "location": "Bay Area, open to NYC",
                    "what_i_want_next": "Founding ML eng or early eng at AI-first startup. Want ownership of inference layer end-to-end.",
                    "dealbreakers": "Big company. Pure research role. Anything where I can't ship to production weekly.",
                    "culture_preferences": "Async-first. Small team. High autonomy. People who care about ML systems craft.",
                },
            },
            "ai_chat_history": {
                "provider": "claude",
                "submitted_at": "2026-05-20T14:32:00Z",
                "raw_output": _MAYA_CHAT_HISTORY,
            },
        },
    },
    {
        "candidate_id": "c_002",
        "name": "Arjun Patel",
        "sources": {
            "scraper": {
                "github": {
                    "username": "arjunp",
                    "top_repos": [
                        {
                            "name": "splitwise-clone",
                            "stars": 56,
                            "languages": ["TypeScript", "Go"],
                            "description": "Full-stack expense splitting app — Next.js + Go API + Postgres. Solo built over 6 weekends.",
                            "commits_last_90_days": 0,
                        },
                        {
                            "name": "deck",
                            "stars": 312,
                            "languages": ["TypeScript"],
                            "description": "Markdown-driven pitch deck builder. Used by 40+ early-stage startups (per analytics).",
                            "commits_last_90_days": 67,
                        },
                        {
                            "name": "redis-clone-go",
                            "stars": 89,
                            "languages": ["Go"],
                            "description": "A weekend project — Redis-compatible in-memory KV store in Go.",
                            "commits_last_90_days": 0,
                        },
                    ],
                    "commit_pattern": "bursty_weekend_heavy",
                    "languages_by_volume": {"TypeScript": 0.52, "Go": 0.28, "Python": 0.12, "Rust": 0.08},
                    "total_public_repos": 41,
                    "followers": 178,
                },
                "linkedin": {
                    "current_role": "Senior Full-Stack Engineer at Ramp",
                    "current_tenure_months": 22,
                    "previous_roles": [
                        {"company": "Plaid", "role": "Full-Stack Engineer", "duration_months": 31},
                        {
                            "company": "(self-employed indie hacker)",
                            "role": "Founder, Deck",
                            "duration_months": 14,
                            "description": "Built and ran deck.so. $4k MRR at peak.",
                        },
                    ],
                    "education": [{"school": "Georgia Tech", "degree": "BS Computer Science", "year": 2018}],
                },
                "portfolio": {
                    "url": "arjun.engineering",
                    "highlighted_projects": [
                        {"title": "Things I learned building deck solo", "type": "blog_post", "url": "arjun.engineering/deck-learnings"},
                    ],
                },
                "google_form": {
                    "compensation_expectations": "$180-230k base, want meaningful equity",
                    "location": "NYC or remote",
                    "what_i_want_next": "Founding engineer at a pre-seed or seed startup. Want to do the full stack — backend, frontend, even some product.",
                    "dealbreakers": "Anything bigger than 20 people. Pure infra role (I like product). Roles where I can't talk to users.",
                    "culture_preferences": "Tight team. High agency. Ship-and-iterate culture. Founders who code.",
                },
            },
            # No ai_chat_history yet — Arjun hasn't pasted it in.
        },
    },
    {
        "candidate_id": "c_003",
        "name": "Priya Krishnan",
        "sources": {
            "scraper": {
                "github": {
                    "username": "priyak",
                    "top_repos": [
                        {
                            "name": "rlhf-experiments",
                            "stars": 23,
                            "languages": ["Python"],
                            "description": "Reproducing recent RLHF papers on smaller models. Class project that grew.",
                            "commits_last_90_days": 4,
                        },
                    ],
                    "commit_pattern": "sparse_academic",
                    "languages_by_volume": {"Python": 0.92, "Jupyter Notebook": 0.08},
                    "total_public_repos": 6,
                    "followers": 41,
                },
                "linkedin": {
                    "current_role": "PhD Candidate, NLP @ CMU",
                    "current_tenure_months": 36,
                    "previous_roles": [
                        {
                            "company": "Google Research",
                            "role": "Research Intern",
                            "duration_months": 4,
                            "description": "Worked on factuality in LLMs. Paper co-authored.",
                        },
                    ],
                    "education": [
                        {"school": "CMU", "degree": "PhD Language Technologies (in progress, year 3)", "year": 2027},
                        {"school": "IIT Bombay", "degree": "BTech Computer Science", "year": 2021},
                    ],
                },
                "portfolio": {
                    "url": "priyakrishnan.com",
                    "highlighted_projects": [
                        {"title": "Faithful Summarization via Contrastive Decoding", "type": "paper", "venue": "ACL 2024", "role": "first author", "citations": 47},
                        {"title": "Calibrating LLM Confidence with Self-Consistency", "type": "paper", "venue": "EMNLP 2023", "role": "second author", "citations": 112},
                    ],
                },
                "google_form": {
                    "compensation_expectations": "$200-260k base, open to less if research is excellent",
                    "location": "Pittsburgh, SF, NYC, or remote",
                    "what_i_want_next": "Research scientist or research engineer at a frontier lab. Want to publish and ship.",
                    "dealbreakers": "Pure product role with no research time. Place that doesn't publish.",
                    "culture_preferences": "Research-driven. Smart colleagues. Publication-friendly. Long-horizon work.",
                },
            },
        },
    },
    {
        "candidate_id": "c_004",
        "name": "Daniel O'Brien",
        "sources": {
            "scraper": {
                "github": {
                    "username": "dobrien",
                    "top_repos": [
                        {
                            "name": "k8s-cost-analyzer",
                            "stars": 1240,
                            "languages": ["Go"],
                            "description": "Per-namespace cost attribution for Kubernetes clusters. Used in production by Mux, Linear, Vercel (per testimonials).",
                            "commits_last_90_days": 88,
                        },
                        {
                            "name": "ml-platform-toolkit",
                            "stars": 47,
                            "languages": ["Python", "Go"],
                            "description": "Learning ML infra by building. Wraps Ray + Modal + Triton into a single CLI.",
                            "commits_last_90_days": 39,
                        },
                    ],
                    "commit_pattern": "consistent_daily_8_years",
                    "languages_by_volume": {"Go": 0.61, "Python": 0.22, "Bash": 0.09, "Rust": 0.08},
                    "total_public_repos": 73,
                    "followers": 1109,
                },
                "linkedin": {
                    "current_role": "Staff Infrastructure Engineer at Datadog",
                    "current_tenure_months": 41,
                    "previous_roles": [
                        {"company": "Cloudflare", "role": "Senior Backend Engineer", "duration_months": 38},
                        {"company": "Square", "role": "Backend Engineer", "duration_months": 29},
                    ],
                    "education": [{"school": "University College Dublin", "degree": "BSc Computer Science", "year": 2014}],
                },
                "portfolio": {
                    "url": "dobrien.dev",
                    "highlighted_projects": [
                        {"title": "k8s-cost-analyzer postmortem: how we scaled to 1.2k stars", "type": "blog_post", "url": "dobrien.dev/kca-postmortem"},
                        {"title": "My journey learning ML infra after 10 years of backend", "type": "blog_post", "url": "dobrien.dev/ml-infra-journey"},
                    ],
                },
                "google_form": {
                    "compensation_expectations": "$280-360k base + meaningful equity",
                    "location": "NYC (currently), Bay Area possible",
                    "what_i_want_next": "ML infrastructure or platform role at an AI-first company. Want to take 10 years of backend rigor and apply it to the ML stack.",
                    "dealbreakers": "Generic backend role. Place that doesn't value reliability. Mostly-research with no production focus.",
                    "culture_preferences": "Engineering-first. Strong SRE culture. People who care about latency and cost.",
                },
            },
        },
    },
    {
        "candidate_id": "c_005",
        "name": "Lena Müller",
        "sources": {
            "scraper": {
                "github": {
                    "username": "lenam",
                    "top_repos": [
                        {
                            "name": "figma-react-bridge",
                            "stars": 178,
                            "languages": ["TypeScript"],
                            "description": "Generate type-safe React components from Figma component variants. Used by my own products.",
                            "commits_last_90_days": 22,
                        },
                    ],
                    "commit_pattern": "moderate_evening",
                    "languages_by_volume": {"TypeScript": 0.71, "CSS": 0.18, "JavaScript": 0.08, "Swift": 0.03},
                    "total_public_repos": 19,
                    "followers": 304,
                },
                "linkedin": {
                    "current_role": "Design Engineer at Linear",
                    "current_tenure_months": 26,
                    "previous_roles": [{"company": "Notion", "role": "Product Designer", "duration_months": 22}],
                    "education": [{"school": "HfG Karlsruhe", "degree": "MA Interaction Design", "year": 2020}],
                },
                "portfolio": {
                    "url": "lenamuller.design",
                    "highlighted_projects": [
                        {"title": "Redesigning Linear's command bar (case study)", "type": "case_study", "url": "lenamuller.design/linear-cmdk"},
                        {"title": "The design system as a TypeScript API (talk)", "type": "conference_talk", "url": "youtube.com/..."},
                    ],
                    "dribbble": "lenamuller",
                    "dribbble_followers": 8200,
                },
                "google_form": {
                    "compensation_expectations": "$190-240k base + equity",
                    "location": "Berlin, remote (CET overlap)",
                    "what_i_want_next": "Design eng role at a small (<30 person) product-led startup. Want to own end-to-end UX of a real product surface.",
                    "dealbreakers": "Pure backend role. No design seat at the table. >50 person companies. US-only meetings.",
                    "culture_preferences": "Craft-obsessed. Designer-engineer hybrids welcome. Small team. Design has equal weight with eng.",
                },
            },
        },
    },
]

_BY_ID = {c["candidate_id"]: c for c in CANDIDATES}
ALL = CANDIDATES


def get_by_id(candidate_id: str) -> Optional[dict]:
    return _BY_ID.get(candidate_id)
