import type { EmperData, EmperShipped } from "./data";
import { MOCK } from "./data";

interface BuildArgs {
  email: string;
  name?: string | null;
  goals?: Record<string, string> | null;
  docCount?: number;
}

/**
 * Map a logged-in candidate's stored `goals` JSON (the LLM-extracted profile)
 * onto the prototype's data shape. Falls back to MOCK fields where data is
 * missing so the UI still has something to render.
 */
export function buildEmperData({
  email,
  name,
  goals,
  docCount = 0,
}: BuildArgs): EmperData {
  const g = goals ?? {};

  const displayName =
    (name && name.trim()) || (email ? email.split("@")[0] : "You");
  const initials =
    displayName
      .split(/\s+/)
      .map((s) => s[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const arcBody =
    g.career_trajectory || g.summary || MOCK.arc.body;
  const howIWorkBody =
    g.working_style || g.communication_style || MOCK.howIWork.body;
  const optimizingBody =
    g.values || g.intellectual_interests || MOCK.optimizingFor.body;

  const shipped: EmperShipped[] = g.strengths
    ? g.strengths
        .split(/,\s*/)
        .filter(Boolean)
        .slice(0, 3)
        .map((s, i) => ({
          title: s,
          where: g.experience_level || "—",
          blurb: MOCK.shipped[i]?.blurb ?? "",
        }))
    : MOCK.shipped;

  const sourceLabel = docCount > 0 ? `${docCount} document${docCount === 1 ? "" : "s"}` : "your documents";

  return {
    ...MOCK,
    user: {
      ...MOCK.user,
      name: displayName,
      role: g.experience_level
        ? `${g.experience_level} · ${g.industries ?? "Engineering"}`
        : MOCK.user.role,
      company: g.industries ?? MOCK.user.company,
      location: MOCK.user.location,
      publicProfile: true,
      yearsExp: 0,
      initials,
      email,
    },
    arc: { body: arcBody, sources: [sourceLabel, "Kira chat"] },
    howIWork: { body: howIWorkBody, sources: [sourceLabel] },
    optimizingFor: { body: optimizingBody, sources: ["Kira chat"] },
    shipped,
    shippedSources: [sourceLabel],
    gapQuestions: countGaps(g),
  };
}

function countGaps(g: Record<string, string>) {
  const interesting = [
    "career_trajectory",
    "working_style",
    "values",
    "intellectual_interests",
    "communication_style",
  ];
  return interesting.filter((k) => !g[k]).length;
}
