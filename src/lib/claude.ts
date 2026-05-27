import Anthropic from "@anthropic-ai/sdk";

let _anthropic: Anthropic | null = null;
export function getAnthropic() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

export const MODEL = "claude-sonnet-4-6";

export async function extractCandidateContext(
  documents: Array<{ content: string; docType: string }>
): Promise<Record<string, any>> {
  const combined = documents
    .map((d) => `[${d.docType.toUpperCase()}]\n${d.content}`)
    .join("\n\n---\n\n");

  const message = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: `You are an expert at understanding candidates from their documents.
Extract key signals that go beyond what's explicitly stated — infer working style,
values, intellectual interests, communication style, and career trajectory from how
things are written, not just what is written. Return a JSON object.`,
    messages: [
      {
        role: "user",
        content: `Analyze these candidate documents and extract the following as a JSON object:
{
  "skills": "comma-separated technical and soft skills",
  "experience_level": "junior/mid/senior/staff/principal",
  "industries": "industries worked in or interested in",
  "working_style": "inferred working style (e.g. independent, collaborative, structured)",
  "intellectual_interests": "topics they seem genuinely passionate about",
  "communication_style": "how they communicate (concise, detailed, narrative, etc.)",
  "career_trajectory": "pattern of career moves and ambitions",
  "values": "inferred professional values",
  "strengths": "top 3-5 genuine strengths",
  "summary": "2-3 sentence holistic summary of this candidate",
  "projects": [
    {
      "title": "short project title",
      "description": "one-paragraph description",
      "role": "role on project",
      "timeframe": "dates or duration",
      "link": "optional url or repo",
      "highlights": "comma-separated bullets or achievements"
    }
  ]
}

Documents:
${combined.slice(0, 12000)}`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return {};
}

export async function scoreMatch(
  candidateContext: string,
  jobContext: string,
  candidateGoals: string
): Promise<{
  score: number;
  reasoning: string;
  strengths: string[];
  gaps: string[];
  cultureFit: string;
  recommendation: string;
}> {
  const message = await getAnthropic().messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: `You are an expert talent matcher. You deeply understand both what candidates
want and what companies need, and you match based on genuine fit — not just keyword matching.
Consider: skills alignment, culture fit, growth potential, goals alignment, and working style.
Return a JSON object only.`,
    messages: [
      {
        role: "user",
        content: `Score this candidate-job match on a scale of 0.0-1.0 and explain why.

CANDIDATE PROFILE:
${candidateContext}

CANDIDATE GOALS & PREFERENCES:
${candidateGoals}

JOB / COMPANY CONTEXT:
${jobContext}

Return JSON:
{
  "score": 0.0-1.0,
  "reasoning": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "gaps": ["gap 1", "gap 2"],
  "cultureFit": "one sentence on culture fit",
  "recommendation": "strong_match | good_match | possible_match | weak_match"
}`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}

  return {
    score: 0.5,
    reasoning: "Unable to generate detailed analysis.",
    strengths: [],
    gaps: [],
    cultureFit: "",
    recommendation: "possible_match",
  };
}

export async function* streamGoalsChat(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  extractedProfile: string,
  missingFields?: string[]
) {
  let knownSection = "";
  let missingSection = "";

  try {
    const profile = JSON.parse(extractedProfile);
    const knownEntries = Object.entries(profile).filter(
      ([, v]) => v && String(v).trim().length > 0
    );
    if (knownEntries.length > 0) {
      knownSection =
        "ALREADY KNOWN (do NOT ask about any of these — treat them as facts):\n" +
        knownEntries.map(([k, v]) => `  ${k}: ${v}`).join("\n");
    }
  } catch {
    knownSection = `ALREADY KNOWN (raw):\n${extractedProfile}`;
  }

  if (missingFields && missingFields.length > 0) {
    missingSection =
      "MISSING — only ask about these (in order of importance):\n" +
      missingFields.map((f) => `  - ${f}`).join("\n");
  } else {
    missingSection =
      "Nothing critical is missing. Do NOT ask any questions — greet the candidate, briefly confirm what you know, and close the conversation.";
  }

  const stream = getAnthropic().messages.stream({
    model: MODEL,
    max_tokens: 800,
    system: `You are Kira, Emper's career guide — warm, precise, and intentionally brief.
The candidate has already uploaded their documents (resume, GitHub, etc.) and the key
facts below were extracted from those documents. Treat them as verified — do not
question whether documents were provided; they were.

${knownSection}

${missingSection}

Hard rules:
- NEVER add disclaimers like "I don't have your documents" or "no documents were provided" —
  the data above IS from their documents.
- NEVER ask about a field listed under ALREADY KNOWN. If the user volunteers info that
  matches a known field, acknowledge it and move on — do not ask follow-ups on it.
- Ask ONE question at a time. Wait for the answer before asking the next.
- Ask at most 3 questions total across the whole conversation.
- Keep each question concrete and answerable in 1-2 sentences.
- When all missing fields are covered (or after 3 questions), stop and give a brief
  closing statement — do not loop back to known topics.`,
    messages,
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield event.delta.text;
    }
  }
}
