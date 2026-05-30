/**
 * Text the candidate copies into Claude / ChatGPT / Gemini / Grok to extract a
 * 13-section behavioral profile from their past conversations.
 *
 * The shape must align with izhaar-agents/src/prompts/ai_chat_history_prompt.py
 * (AI_CHAT_HISTORY_EXTRACTION_PROMPT) — Python's parser expects sections
 * numbered 1-13 with the broad-category labels below, so it can tag the
 * resulting claims with the controlled vocabulary that flows through to
 * the dual-write into candidates.goals.
 *
 * Section list and tags:
 *   1.  working_style
 *   2.  decision_making
 *   3.  communication
 *   4.  collaboration
 *   5.  professional_goals
 *   6.  technical_interests
 *   7.  growth_areas
 *   8.  allergies (what frustrates them)
 *   9.  conflict_handling
 *   10. risk_tolerance
 *   11. energy_patterns
 *   12. dealbreakers
 *   13. sensitive_topics (almost always "not enough signal — skipping")
 */
export const CHAT_HISTORY_USER_PROMPT = `Based on our past conversations, write a structured 13-section behavioral profile of me. Each section should be 2-4 sentences. Be specific — cite patterns you've observed, not generic compliments.

PRIVACY RULES (these are mandatory):
- DO NOT mention specific company names, school names, project names, or framework/product names that would identify my employers, projects, or specific tools.
- DO NOT include names of any people I've mentioned.
- DO NOT include locations more specific than country.
- DO NOT include dates more specific than year.
- DO NOT include anything about mental health, family, relationships, religion, or politics. If a section would only be answerable by referencing those, write "Not enough signal — skipping per privacy rules."
- If a section has no clear signal from our conversations, write "Not enough signal."

Output format (use these exact section headers and numbers):

1. Working style
2. Decision-making
3. Communication
4. Collaboration
5. Professional goals
6. Technical interests
7. Growth areas
8. What I'm allergic to
9. How I handle conflict
10. Risk tolerance
11. Energy patterns
12. Dealbreakers
13. Sensitive topics

For each, write 2-4 sentences anchored in specific patterns from our conversations. No bullet points — prose. Skip any section with "Not enough signal" if you genuinely don't have signal — don't invent.`;
