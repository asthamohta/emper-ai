import type { EmperData, EmperShipped } from "./data";
import { MOCK } from "./data";

interface BuildArgs {
  email: string;
  name?: string | null;
  goals?: Record<string, any> | null;
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

  const sourceLabel = docCount > 0 ? `${docCount} document${docCount === 1 ? "" : "s"}` : "your documents";

  const arcBody = g.career_trajectory || g.summary || "";
  const howIWorkBody = buildHowIWork(g);
  const optimizingBody = g.values || g.intellectual_interests || "";

  // Use extracted projects array if available, fall back to strengths heuristic
  const shipped = buildShipped(g);

  const roleLabel = buildRoleLabel(g);

  return {
    ...MOCK,
    user: {
      ...MOCK.user,
      name: displayName,
      role: roleLabel,
      company: g.industries ?? MOCK.user.company,
      location: MOCK.user.location,
      publicProfile: g.profile_public !== "false",
      yearsExp: 0,
      initials,
      email,
    },
    arc: { body: arcBody, sources: arcBody ? [sourceLabel, "Kira chat"] : [] },
    howIWork: { body: howIWorkBody, sources: howIWorkBody ? [sourceLabel] : [] },
    optimizingFor: { body: optimizingBody, sources: optimizingBody ? ["Kira chat", sourceLabel] : [] },
    shipped,
    shippedSources: shipped.length > 0 ? [sourceLabel] : [],
    gapQuestions: countGaps(g),
  };
}

function buildRoleLabel(g: Record<string, any>): string {
  const parts: string[] = [];
  if (g.experience_level) parts.push(g.experience_level);
  if (g.industries) parts.push(g.industries);
  return parts.join(" · ");
}

function buildHowIWork(g: Record<string, any>): string {
  const parts: string[] = [];
  if (g.working_style) parts.push(g.working_style);
  if (g.communication_style) parts.push(g.communication_style);
  if (g.skills) parts.push(`Stack: ${g.skills}`);
  return parts.join(" · ") || "";
}

function buildShipped(g: Record<string, any>): EmperShipped[] {
  // Prefer structured projects array from extraction
  const projects = Array.isArray(g.projects) ? g.projects : [];
  if (projects.length > 0) {
    return projects.slice(0, 6).map((p: any) => ({
      title: p.title || "Untitled project",
      where: p.timeframe || p.role || "",
      blurb: p.description || p.highlights || "",
    }));
  }

  // Fall back to strengths as a last resort
  if (g.strengths) {
    return g.strengths
      .split(/,\s*/)
      .filter(Boolean)
      .slice(0, 3)
      .map((s: string) => ({
        title: s,
        where: g.experience_level || "",
        blurb: "",
      }));
  }

  return [];
}

function countGaps(g: Record<string, any>) {
  const interesting = [
    "career_trajectory",
    "working_style",
    "values",
    "intellectual_interests",
    "communication_style",
  ];
  return interesting.filter((k) => !g[k]).length;
}
