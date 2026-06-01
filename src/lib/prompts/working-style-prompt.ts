export const WORKING_STYLE_PROMPT = `You are helping me build a structured behavioral profile to share with potential employers through Izhaar, an AI-native talent platform. Go through our past conversations and produce the profile defined below.

This profile will be reviewed by me before any of it is shared with companies. Take this seriously — both the honesty and the privacy.

═══ FRAMING RULES ═══

Use third-person throughout. Refer to the individual as "the user" — never "you," "your," "I," or "my." This is a documentation task, not a conversation.

Every claim must be paired with evidence: a paraphrased pattern from conversations on a given date. Do NOT quote the user verbatim — paraphrase. Verbatim quotes can leak private context.

If you do not have enough signal on a question, write "not enough signal." Do not invent. Saying you do not know is more valuable than guessing.

Be specific, not flattering. Generic descriptions ("thoughtful," "analytical," "curious," "hardworking") tell nobody anything. Patterns do.

Real people have both strengths and growth edges. A profile with only strengths is wrong.

Cite patterns across multiple conversations. A single conversation is not a pattern.

═══ PRIVACY RULES — NEVER VIOLATE ═══

Do NOT include any of these in the output:

- The user's name, employer name, school name, program name
- Project names, product names, internal codenames
- Specific frameworks, readings, course titles, or technical notation that could identify a research group, team, or institution
- Names of advisors, managers, professors, collaborators, friends, or any other individuals
- Specific industries combined with role specifics that triangulate identity
- Specific causes or missions specific enough to identify the user
- Demographic markers protected under employment law: age, family status, relationship status, religion, sexual orientation, gender identity, ethnicity, national origin, disability, health conditions, pregnancy
- Political views or affiliations

If a claim can only be made by referencing one of these, rewrite at one abstraction higher. Examples:

- "Cluster analysis pipeline at a research lab" becomes "executes on quantitative research work"
- "Prepping for Rubrik PM interviews" becomes "preparing for product roles at infrastructure companies"
- "Reads Walker and Soule on organizational culture" becomes "engages with organizational behavior research"

NEVER name specific projects, employers, schools, advisors, or frameworks — even when the user has clearly mentioned them. This is non-negotiable.

═══ SENSITIVE TOPIC HANDLING ═══

Do NOT draw on or reference any of these, even if the user has mentioned them in conversations:

- Mental health (anxiety, depression, burnout, therapy, medication)
- Family circumstances or relationship issues
- Health conditions or medical history
- Financial stress or specific money concerns
- Conflicts with specific named people
- Anything the user has said "in confidence" or "off the record"
- Anything that would feel like a betrayal if shared with a potential employer

If a section can only be answered using these, write "not enough professional context to answer."

═══ OUTPUT FORMAT ═══

Output exactly 13 sections in the order below. No preamble. No closing summary. No conversational filler.

For each section, use this structure:

SECTION N · [TITLE]

[2-4 sentences of pattern description in third person.]

Evidence: [Paraphrased pattern from conversations.] Date range: [YYYY-MM-DD to YYYY-MM-DD or "ongoing"].

═══ THE THIRTEEN SECTIONS ═══

SECTION 1 · TOPIC PATTERNS
Three or four areas the user engages with most. For each, the texture of engagement — learning, executing, exploring, debating. Do they arrive scoped or wandering? Is it work, side-interest, or open curiosity? Be specific about texture. No project names. No employer hints.

SECTION 2 · HOW THE USER BRINGS PROBLEMS
The shape of how the user opens problems. Scoped before asking, or thinking out loud? Wants answers, options, or sparring partners? Looking for validation, decisions, or exploration? How much context is given upfront?

SECTION 3 · WHEN THE USER PUSHES BACK
Triggers for disagreement — wrong facts, weak reasoning, missed context, wrong framing? Does the user push on details, framing, or conclusions? How direct? When does the user just accept and move on?

SECTION 4 · COMMUNICATION STYLE
Terse or expansive. Formal or casual. Structured or flowing. Use of jargon, hedging, jokes, context assumptions. Patient or impatient with back-and-forth.

SECTION 5 · WORKING STYLE
Based on how the user engages, not on what they claim about themselves. Think-then-act or iterate-while-moving? Want one good answer or multiple rounds? Autonomy or structure? Comfort with ambiguity? Depth vs breadth pattern?

SECTION 6 · AI COLLABORATION PATTERN
How the user actually uses AI. Thinking partner, writing assistant, sounding board, devil's advocate, code generator? Do they trust outputs and use them directly, or treat them as starting points to heavily edit? Do they push for better answers or accept the first? How sophisticated is their prompting?

SECTION 7 · PROFESSIONAL GOALS
Only what the user has actually shared about career and choices. What kind of work do they seem to want more of? Less of? What are they optimizing for — depth, autonomy, scale, impact, equity, mission, craft, learning, money? What direction are they pointed?

Do NOT invent goals. Use general categories, not specific company or role names.

SECTION 8 · LEARNING vs EXECUTING
What does the user ask about as a learner (building skill or knowledge)? What do they ask about as an executor (already know it, just want to move faster)? Is there a trajectory — moving from learner to executor in any area?

This distinction matters more than a skills list. It shows growth trajectory.

SECTION 9 · HOW THE USER HANDLES BEING WRONG
When corrected, does the user integrate the correction or push back? What is the pattern on realizing they are off-track? Do they revisit assumptions or double down? How quickly do they acknowledge mistakes vs justify them?

If no signal, say so explicitly. Do not skip this lightly — it is essential context.

SECTION 10 · GROWTH EDGES
Where does the user struggle? Frame as growth, not flaws. What problems do they avoid or rush through? What do they return to without resolving? Where does their thinking get fuzzy? What kinds of work seem to drain or frustrate them?

A profile without growth edges is incomplete. If you genuinely cannot find any, write "limited friction signal in our chats" — but look hard first.

SECTION 11 · FRICTION WITH COLLABORATORS
Based ONLY on what the user has shared about working with others. What kinds of people or styles do they clash with? What feedback do they resist? What kinds of work environments would burn them out?

Do not use anything from Sensitive Topic Handling above. Do not name specific people, even if the user has named them.

SECTION 12 · SUSTAINED INTERESTS OUTSIDE WORK
What does the user spend significant time on outside of work? Creative projects, sports, intellectual pursuits, sustained hobbies, communities they're part of. Only sustained patterns across multiple conversations — not one-time mentions.

Do NOT include: family activities, health and fitness routines, religious or political activities, romantic relationships, anything in the protected-class list.

If nothing has come up beyond work, write "no signal on non-work interests." Do not invent hobbies to fill the section.

SECTION 13 · INTELLECTUAL TEXTURE
What domains does the user engage with intellectually beyond direct work? What kinds of books, ideas, podcasts, or threads come up across conversations? This reveals how the user thinks about the world.

Stay general — name the texture ("economics and strategy," "philosophy of mind," "behavioral science"), not specific authors or titles unless they come up repeatedly and unambiguously.

If no signal, say so.

═══ HONESTY CHECK — RUN BEFORE OUTPUTTING ═══

Re-read your draft. If it sounds like a flattering profile that would impress a hiring manager, it has failed. Real people have patterns that include both strengths and growth edges.

If your draft is all strengths, return to Sections 9, 10, and 11 and surface the growth edges and friction patterns. If you genuinely cannot find any, write "Profile may be incomplete — limited friction or failure signal in our chats" at the bottom.

If you find yourself making up specifics, stop and write "not enough signal" for that section instead.

═══ PRIVACY CHECK — RUN BEFORE OUTPUTTING ═══

Re-read your draft. For each sentence, ask: "Does this contain anything that could identify this person?" If yes, rewrite at one abstraction level higher.

Specifically scan for:
- Any proper nouns referring to companies, schools, products, projects
- Specific technical terms unique to a small group
- Specific framework or theory citations
- Specific cause areas narrow enough to identify
- Anything from the Sensitive Topics list

═══ OUTPUT REQUIREMENTS ═══

- Output ONLY the thirteen sections, in order.
- No preamble, no intro text, no conversational filler.
- No sign-off.
- End the output with exactly this line: "Generated by: Claude"
- The "Generated by:" line must be the absolute final text in your response.`;
