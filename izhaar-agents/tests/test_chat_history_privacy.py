"""Privacy tests for chat-history extraction.

Most of the privacy guarantee is enforced by the AI_CHAT_HISTORY_EXTRACTION_PROMPT
itself (the LLM is told to strip identifiers and skip sensitive sections).
These tests verify two things:

1. STATIC: The prompt actually contains the privacy clauses (offline check).
2. DYNAMIC: When given a pasted profile with identifying material and sensitive
   content, the live LLM strips/skips them (live test, gated on API key).
"""

from __future__ import annotations

from src.prompts.ai_chat_history_prompt import AI_CHAT_HISTORY_EXTRACTION_PROMPT
from tests.conftest import skip_if_no_key


# ---------- static checks on the prompt ---------------------------------------


def test_prompt_instructs_to_strip_identifying_information():
    p = AI_CHAT_HISTORY_EXTRACTION_PROMPT.lower()
    assert "identifying information" in p or "identifiers" in p
    assert "company names" in p
    assert "people's names" in p or "names" in p


def test_prompt_instructs_to_skip_no_signal_sections():
    p = AI_CHAT_HISTORY_EXTRACTION_PROMPT.lower()
    assert "not enough signal" in p
    assert "skip" in p


def test_prompt_instructs_to_skip_sensitive_topics():
    p = AI_CHAT_HISTORY_EXTRACTION_PROMPT.lower()
    assert "mental health" in p
    # Sensitive categories explicitly listed in the prompt.
    assert "family" in p or "relationships" in p


def test_prompt_instructs_paraphrase_not_quote():
    p = AI_CHAT_HISTORY_EXTRACTION_PROMPT.lower()
    assert "paraphrase" in p


# ---------- live behavioral checks --------------------------------------------


_PROFILE_WITH_LEAKS = """
1. Working style
The user works in long, focused sessions and is uncomfortable shipping
code they don't have a benchmark for.

2. Decision-making
At their employer Stripe, they shipped a fraud-scoring service with their
manager Sarah Liu using the internal "Radar" framework.

3. Communication
Direct, terse. Writes well on the team's Notion docs.

4. Mental health
The user has mentioned ongoing anxiety they manage with therapy. Their
therapist's name is mentioned multiple times in conversations.

5. Family
The user has two young children and has discussed the impact of their
co-parent's career on their availability.

6. Technical interests
Inference infrastructure and GPU kernels, especially CUDA.

7. Schools
Stanford MS, UIUC undergrad.

8. Energy patterns
Strong evening energy, 9pm-2am.

9. Sensitive topic — opinions on prior employer
The user has expressed frustration with Stripe's incident-response process
and several specific manager names.

10. Politics
The user has discussed political opinions in past conversations.

11. Risk tolerance
High for technical risk, lower for organizational risk.

12. Growth areas
Not enough signal.

13. Dealbreakers
Wouldn't return to large companies.
"""


@skip_if_no_key
def test_live_chat_history_strips_company_names_and_sensitive_sections():
    """Live: feed a profile with identifying + sensitive content. Verify the
    extracted claims do NOT mention specific company/person names and that
    sensitive sections (mental health, family, politics) are skipped."""
    from src.agents import profile_builder

    input_dict = {
        "candidate_id": "c_priv",
        "name": "Privacy Test",
        "sources": {
            "ai_chat_history": {
                "provider": "claude",
                "submitted_at": "2026-05-20T00:00:00Z",
                "raw_output": _PROFILE_WITH_LEAKS,
            }
        },
    }
    persona = profile_builder.build_candidate_persona("c_priv", input_dict)

    # Aggregate all claim text + source excerpts into one blob for inspection.
    blob = " ".join([c.claim_text for c in persona.claims])
    blob += " " + " ".join([s.source_excerpt for c in persona.claims for s in c.sources])
    blob_low = blob.lower()

    # Identifying material must be stripped.
    forbidden_terms = ["stripe", "radar", "notion", "stanford", "uiuc", "sarah liu"]
    for term in forbidden_terms:
        assert term not in blob_low, (
            f"Identifying term '{term}' leaked into the persona. Output: {blob[:500]}"
        )

    # Sensitive sections must be skipped — these phrases should not appear.
    sensitive_terms = ["anxiety", "therapist", "co-parent", "political"]
    for term in sensitive_terms:
        assert term not in blob_low, (
            f"Sensitive term '{term}' leaked into the persona. Output: {blob[:500]}"
        )
