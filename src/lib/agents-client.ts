/**
 * Network boundary to the Python agent pipeline at izhaar-agents/.
 *
 * This is the ONLY file in the Next.js app that talks to the Python service.
 * All requests use a shared API key via X-Agents-Key header (when configured)
 * and a per-call timeout. Non-2xx responses become a typed AgentsClientError
 * with the Python error body attached.
 *
 * Architecture choice (see integration plan, Q1):
 *   Python is stateless. Build calls send the full multi-source dict; match
 *   calls send full candidate + role persona objects. Python computes and
 *   returns JSON. Next.js persists in Postgres (candidate_personas /
 *   candidate_conversations / candidate_verdicts). The Python service holds
 *   no candidate state on the integrated path.
 *
 * Note on the corresponding Python endpoints:
 *   - POST /api/v1/build/candidate-from-payload  (added in Part 4b)
 *   - POST /api/v1/build/role-from-payload       (added in Part 4b)
 *   - POST /api/v1/match/run-from-payload        (added in Part 6)
 *   These do not exist yet — calling the client functions before those parts
 *   land will return 404 from Python. healthcheck() works today.
 */

const BASE_URL = (process.env.AGENTS_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");
const API_KEY = process.env.AGENTS_API_KEY ?? "";

/**
 * Stamp written to every candidate_personas / candidate_verdicts row so we
 * know which prompt suite + Claude model produced it. Format:
 *   "<model-id>/<feature-version-date>"
 * Bump this whenever prompts in izhaar-agents/src/prompts/ change in a way
 * that meaningfully shifts output. Existing rows keep their original stamp.
 */
export const AGENTS_PIPELINE_VERSION = "sonnet-4-6/v1_multi_source_2026_05" as const;

// Build / role-build are typically a few seconds. The match call wraps the
// whole pre-filter → conversation (8-12 turns) → judge pipeline and is the
// only place we lift the timeout; 30s is the right ceiling for everything
// else and 90s gives realistic match runs (30-60s typical) headroom.
const DEFAULT_TIMEOUT_MS = 30_000;
// Build can take up to 3 LLM calls when both scraper + chat history are
// present (extract scraper → extract chat history → merge). On a slow
// Anthropic day with retries this can run >5 minutes — 10-min ceiling
// keeps the integrated flow alive when Anthropic is degraded.
const BUILD_TIMEOUT_MS = 600_000;
const MATCH_TIMEOUT_MS = 90_000;
const HEALTH_TIMEOUT_MS = 3_000;

export class AgentsClientError extends Error {
  readonly status: number;
  readonly path: string;
  readonly body: unknown;

  constructor(status: number, path: string, body: unknown, message?: string) {
    super(message ?? `Agents service error ${status} at ${path}`);
    this.name = "AgentsClientError";
    this.status = status;
    this.path = path;
    this.body = body;
  }
}

// ─── Persona shapes ──────────────────────────────────────────────────────────
// These mirror the Pydantic models in izhaar-agents/src/models/persona.py.
// Kept loose (unknown for nested-but-uninteresting fields) — we treat the
// persona as opaque JSON to persist in JSONB. Tighten typing if/when the
// Next.js side needs to read individual fields beyond what's already typed.

export type EvidenceTier = "verified" | "stated" | "inferred";

export type SourceAttribution = {
  source_type: string;
  source_excerpt: string;
  source_url?: string | null;
};

export type Claim = {
  claim_id: string;
  subject_id: string;
  claim_text: string;
  evidence_tier: EvidenceTier;
  sources: SourceAttribution[];
  confidence: number;
  tags: string[];
  corroboration_count: number;
  discrepancy_flag: string | null;
};

export type StatedPreference = {
  field: string;
  value: string;
  source: string;
};

export type CandidatePersona = {
  candidate_id: string;
  name: string;
  summary: string;
  claims: Claim[];
  stated_preferences: StatedPreference[];
  explicit_gaps: string[];
  system_prompt: string;
  built_at: string;
};

export type RolePersona = {
  role_id: string;
  company_name: string;
  role_title: string;
  summary: string;
  claims: Claim[];
  stated_preferences: StatedPreference[];
  anti_fit_criteria: string[];
  system_prompt: string;
  built_at: string;
};

// ─── Input shapes ────────────────────────────────────────────────────────────

/**
 * Multi-source candidate input. Mirrors the shape consumed by Python's
 * profile builder (izhaar-agents/src/agents/profile_builder.py module
 * docstring). Either branch of `sources` may be absent.
 */
export type CandidateSources = {
  scraper?: {
    resume?: unknown;
    github?: unknown;
    linkedin?: unknown;
    portfolio?: unknown;
    website?: unknown;
    huggingface?: unknown;
    google_form?: unknown;
    [key: string]: unknown;
  };
  ai_chat_history?: {
    provider: "claude" | "chatgpt" | "gemini" | "grok";
    submitted_at: string;
    raw_output: string;
  };
};

/**
 * Role + company input consumed by Python's role builder.
 * See izhaar-agents/src/mock_data/roles.py for the canonical shape.
 */
export type RoleInput = {
  company: { name: string; [key: string]: unknown };
  role: { title: string; [key: string]: unknown };
};

// ─── Match result shape ──────────────────────────────────────────────────────

export type Turn = {
  turn_number: number;
  speaker: "candidate" | "role";
  content: string;
  timestamp: string;
  sycophancy_score?: number | null;
  internal_reasoning?: string | null;
};

export type Conversation = {
  conversation_id: string;
  candidate_id: string;
  role_id: string;
  transcript: Turn[];
  termination_reason:
    | "candidate_walked_away"
    | "role_walked_away"
    | "convergence_yes"
    | "convergence_no"
    | "max_turns"
    | "stuck_agreement";
  walked_away_by: "candidate" | "role" | null;
  walk_reason: string | null;
  turn_count: number;
  cost_usd: number;
  started_at: string;
  ended_at: string;
};

export type Verdict = {
  verdict_id: string;
  conversation_id: string;
  candidate_id: string;
  role_id: string;
  match_verdict: "strong" | "good" | "marginal" | "no_match";
  confidence: number;
  reasoning: string;
  evidence_for_match: string[];
  evidence_against_match: string[];
  unresolved_concerns: string[];
  surface_to_human: boolean;
  bias_flags: string[];
  judged_at: string;
};

export type MatchResult = {
  prefilter: { passed: boolean; score: number };
  // If pre-filter blocks, conversation and verdict are null and the caller
  // should persist the prefilter outcome only.
  conversation: Conversation | null;
  verdict: Verdict | null;
};

export type HealthStatus = {
  reachable: boolean;
  service?: string;
  error?: string;
  latencyMs: number;
};

// ─── Low-level request helper ────────────────────────────────────────────────

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  options?: { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (API_KEY) headers["X-Agents-Key"] = API_KEY;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
      cache: "no-store",
    });
  } catch (err) {
    clearTimeout(t);
    const e = err as Error;
    if (e.name === "AbortError") {
      throw new AgentsClientError(
        0,
        path,
        null,
        `Agents service timed out after ${timeoutMs}ms at ${path}`
      );
    }
    throw new AgentsClientError(
      0,
      path,
      null,
      `Could not reach agents service at ${BASE_URL}${path}: ${e.message}`
    );
  } finally {
    clearTimeout(t);
  }

  // Always read the body — we want it in the error for non-2xx responses.
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new AgentsClientError(res.status, path, parsed);
  }
  return parsed as T;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Build a candidate persona from a multi-source input dict.
 *
 * Python endpoint: POST /api/v1/build/candidate-from-payload (added in Part 4b).
 * Until that endpoint lands, this throws AgentsClientError with status 404.
 */
export async function buildCandidatePersona(
  candidateId: string,
  sources: CandidateSources,
  name?: string
): Promise<CandidatePersona> {
  return request<CandidatePersona>(
    "POST",
    "/api/v1/build/candidate-from-payload",
    { candidate_id: candidateId, name, sources },
    { timeoutMs: BUILD_TIMEOUT_MS }
  );
}

/**
 * Build a role persona from a structured role + company input dict.
 *
 * Python endpoint: POST /api/v1/build/role-from-payload (added in Part 4b).
 */
export async function buildRolePersona(
  roleId: string,
  roleData: RoleInput
): Promise<RolePersona> {
  return request<RolePersona>(
    "POST",
    "/api/v1/build/role-from-payload",
    { role_id: roleId, ...roleData },
    { timeoutMs: BUILD_TIMEOUT_MS }
  );
}

/**
 * Run a stateless match: pre-filter → conversation → judge.
 *
 * Per the integration plan (Q1), Python is stateless — we send full persona
 * objects in the request body, Python returns prefilter + conversation +
 * verdict, Next.js persists. Caller pulls IDs from persona objects for its
 * own bookkeeping; the wire format intentionally does not duplicate them.
 *
 * Python endpoint: POST /api/v1/match/run-from-payload (added in Part 6).
 *
 * 90s timeout (vs the 30s default) because a real match is 8-12 LLM-driven
 * turns + a judge call and runs 30-60s under normal conditions.
 */
export async function runMatch(args: {
  candidatePersona: CandidatePersona;
  rolePersona: RolePersona;
}): Promise<MatchResult> {
  return request<MatchResult>(
    "POST",
    "/api/v1/match/run-from-payload",
    {
      candidate_persona: args.candidatePersona,
      role_persona: args.rolePersona,
    },
    { timeoutMs: MATCH_TIMEOUT_MS }
  );
}

/**
 * Convenience wrapper around runMatch that does the DB reads on the Next.js
 * side and then calls the stateless Python pipeline. The fetcher functions
 * are injected so this module stays the network boundary — persona-store.ts
 * (Part 2) supplies the real fetchers; the caller in Part 6 wires them up.
 */
export async function runMatchByIds(
  candidateId: string,
  roleId: string,
  fetchers: {
    fetchCandidatePersona: (id: string) => Promise<CandidatePersona | null>;
    fetchRolePersona: (id: string) => Promise<RolePersona | null>;
  }
): Promise<MatchResult> {
  const [candidatePersona, rolePersona] = await Promise.all([
    fetchers.fetchCandidatePersona(candidateId),
    fetchers.fetchRolePersona(roleId),
  ]);
  if (!candidatePersona) {
    throw new AgentsClientError(
      404,
      "(runMatchByIds local)",
      { candidate_id: candidateId },
      `No persona found for candidate ${candidateId}. Build it first.`
    );
  }
  if (!rolePersona) {
    throw new AgentsClientError(
      404,
      "(runMatchByIds local)",
      { role_id: roleId },
      `No persona found for role ${roleId}. Build it first.`
    );
  }
  return runMatch({ candidatePersona, rolePersona });
}


/**
 * Verify the Python service is reachable. Never throws — returns a status
 * object the caller can render. Used by the dev-mode "Agents service:
 * connected / disconnected" banner referenced in the build plan.
 */
export async function healthcheck(): Promise<HealthStatus> {
  const t0 = Date.now();
  try {
    const json = await request<{ status: string; service: string }>(
      "GET",
      "/healthz",
      undefined,
      { timeoutMs: HEALTH_TIMEOUT_MS }
    );
    return {
      reachable: true,
      service: json.service,
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
      latencyMs: Date.now() - t0,
    };
  }
}

// ─── Debug / introspection ───────────────────────────────────────────────────

/**
 * Where this client is pointed at and whether a shared key is configured.
 * Useful for diagnostics; safe to expose because it doesn't reveal the key.
 */
export function getAgentsClientConfig() {
  return {
    baseUrl: BASE_URL,
    apiKeyConfigured: API_KEY.length > 0,
    defaultTimeoutMs: DEFAULT_TIMEOUT_MS,
    matchTimeoutMs: MATCH_TIMEOUT_MS,
  };
}
