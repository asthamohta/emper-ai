CLAIM_MERGE_PROMPT = """You are merging two sets of claims about the same candidate.

You will receive:
- "scraper_claims": claims extracted from scraped data (resume, GitHub, LinkedIn, portfolio, etc.)
- "chat_history_claims": claims extracted from AI chat history analysis

Output a SINGLE merged list of claims. Every claim in your output is exactly one of the following three kinds:

a) AGREED — two claims (one from each set) that say substantively the same thing.
   - Merge into ONE claim with BOTH sources in the `sources` array.
   - Set corroboration_count = 2.
   - The merged claim_text should be the more specific / accurate of the two inputs.
   - Boost confidence per the rules below.
   - discrepancy_flag = null.

b) DISAGREED — two claims (one from each set) that contradict each other.
   - Keep as ONE merged claim with BOTH sources attached.
   - Set discrepancy_flag to a neutral, specific sentence:
     "Scraper data suggests X, chat history suggests Y."
   - Set confidence = 0.40.
   - corroboration_count = 2 (two sources, but conflicting — the discrepancy is the signal).
   - DO NOT pick a side.

c) UNIQUE — claim exists in only one set.
   - Pass through unchanged with the single original source.
   - corroboration_count = 1, discrepancy_flag = null.
   - Apply the single-source confidence cap (see below).

CONFIDENCE RULES:
- Verified claim, single source: cap at 0.85
- Verified claim, two+ sources (corroborated): cap at 0.95
- Stated claim, scraper only: 0.55-0.70
- Stated claim, scraper + corroborating chat history: 0.70-0.85
- Inferred claim, single source: 0.30-0.55
- Inferred claim, two+ sources: 0.50-0.70
- Discrepancy-flagged claim: 0.40 (signal is the discrepancy itself)

SEMANTIC SIMILARITY RULES:
- Two claims "agree" if they describe the same trait, even with different wording. E.g. "Comfortable with ambiguity" and "Thrives without structured roadmaps" agree.
- Two claims "disagree" if they describe the same dimension but make contradictory assertions. E.g. "Strong at independent work" (scraper) vs "Prefers tight pairing and frequent check-ins" (chat history) disagree on collaboration style.
- Adjacent-but-different claims (e.g. "ML expert" vs "Cares about correctness in healthcare") are NOT a match — they're orthogonal. Keep both as UNIQUE.

Output JSON with this exact structure:

{
  "claims": [
    {
      "claim_text": "merged or single claim text",
      "evidence_tier": "verified" | "stated" | "inferred",
      "sources": [
        {
          "source_type": "scraper_github" | "scraper_linkedin" | "scraper_resume" | "scraper_portfolio" | "scraper_huggingface" | "scraper_form" | "ai_chat_history",
          "source_excerpt": "the supporting text from that source",
          "source_url": "optional URL"
        }
      ],
      "confidence": 0.0 to 1.0,
      "tags": ["..."],
      "corroboration_count": 1 | 2,
      "discrepancy_flag": null | "Scraper data suggests X, chat history suggests Y."
    }
  ]
}

Output ONLY valid JSON. No markdown fences, no commentary."""
