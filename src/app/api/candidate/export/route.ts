import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAnthropic, MODEL } from "@/lib/claude";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "candidate") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.userId, session.userId),
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const docs = await db
    .select()
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, candidate.id));

  // Detect GitHub username from stored github docs
  const githubUsername = detectGithubUsername(docs);

  // Fetch rich GitHub data if username known
  let githubSection = "";
  if (githubUsername) {
    try {
      githubSection = await buildGithubSection(githubUsername);
    } catch {
      githubSection = `## GitHub\n\nProfile: https://github.com/${githubUsername}\n`;
    }
  }

  const markdown = buildProfileMarkdown(candidate, docs, githubSection);

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(candidate.name)}-profile-${new Date().toISOString().split("T")[0]}.md"`,
    },
  });
}

// ── GitHub fetching ──────────────────────────────────────────────────────────

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function ghFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: githubHeaders() });
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${url}`);
  return res.json();
}

// Pick up to `max` commits spread across the year, preferring substantive ones
function selectRepresentativeCommits(commits: any[], max: number): any[] {
  const SKIP = /^(merge pull request|merge branch|bump version|chore:|docs:|style:|update changelog)/i;
  const PREFER = /^(feat|fix|refactor|perf|test|add|implement|redesign|migrate|optimize)/i;

  const substantive = commits.filter((c: any) => !SKIP.test(c.commit.message));
  const pool = substantive.length > 0 ? substantive : commits;

  if (pool.length <= max) return pool;

  // Spread evenly across the time window so we sample all quarters, not just recent
  const step = Math.floor(pool.length / max);
  const spread: any[] = [];
  for (let i = 0; i < max && spread.length < max; i++) {
    spread.push(pool[i * step]);
  }

  // Replace up to 2 slots with high-signal commits (feat/fix/refactor) if not already included
  const spreadShas = new Set(spread.map((c: any) => c.sha));
  const highSignal = pool.filter(
    (c: any) => PREFER.test(c.commit.message) && !spreadShas.has(c.sha)
  );
  for (let i = 0; i < Math.min(2, highSignal.length); i++) {
    spread[spread.length - 1 - i] = highSignal[i];
  }

  return spread;
}

async function synthesizeCommits(
  username: string,
  repo: any,
  fullCommits: any[]
): Promise<string | null> {
  if (fullCommits.length === 0) return null;

  const commitBlocks = fullCommits.map((c) => {
    const msg = c.commit.message.split("\n")[0];
    const stats = c.stats ? `+${c.stats.additions} / -${c.stats.deletions} lines` : "";
    const files = (c.files ?? [])
      .slice(0, 8)
      .map((f: any) => {
        const patch = f.patch ? "\n" + f.patch.split("\n").slice(0, 12).join("\n") : "";
        return `  ${f.filename} (+${f.additions}/-${f.deletions})${patch}`;
      })
      .join("\n");
    return `Commit: ${c.sha?.slice(0, 7)} — ${msg}\nStats: ${stats}\nFiles:\n${files}`;
  }).join("\n\n---\n\n");

  try {
    const message = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 200,
      system: `You are a senior engineer evaluating a candidate's GitHub commits.
Be specific and evidence-based. Never generalize or pad. Write 2-3 tight sentences covering:
1. What layer of the stack this work touches (core logic, API, infra, tests, docs)
2. Technical depth and complexity visible in the diff
3. Any engineering patterns worth noting (error handling, test discipline, abstraction choices, PR hygiene)
Do not mention the candidate's name. Do not use bullet points. Plain prose only.`,
      messages: [
        {
          role: "user",
          content: `Repo: ${repo.full_name} (${repo.language ?? "unknown language"})
Author: ${username}

${commitBlocks}`,
        },
      ],
    });
    const text = message.content[0].type === "text" ? message.content[0].text : null;
    return text?.trim() ?? null;
  } catch {
    return null;
  }
}

async function buildGithubSection(username: string): Promise<string> {
  const [profile, allRepos] = await Promise.all([
    ghFetch<any>(`https://api.github.com/users/${username}`),
    ghFetch<any[]>(`https://api.github.com/users/${username}/repos?per_page=50&sort=pushed&type=owner`),
  ]);

  const lines: string[] = [];
  lines.push(`## GitHub Activity`);
  lines.push(`Profile: https://github.com/${username} · on GitHub since ${profile.created_at?.slice(0, 7)} · ${profile.public_repos} public repos\n`);

  // Aggregate language bytes across all repos
  const langBytes: Record<string, number> = {};
  const langFetches = allRepos.slice(0, 10).map(async (repo) => {
    try {
      const langs = await ghFetch<Record<string, number>>(
        `https://api.github.com/repos/${repo.full_name}/languages`
      );
      for (const [lang, bytes] of Object.entries(langs)) {
        langBytes[lang] = (langBytes[lang] ?? 0) + bytes;
      }
    } catch {}
  });

  // Sort repos: originals first, then forks; within each group sort by pushed_at
  const originals = allRepos.filter((r) => !r.fork);
  const forks = allRepos.filter((r) => r.fork);
  const selectedOriginals = originals.slice(0, 5);
  const selectedForks = forks.slice(0, 3);
  const selectedRepos = [...selectedOriginals, ...selectedForks];

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const since = oneYearAgo.toISOString();

  // Fetch all commits from the last year per repo (paginate up to 100)
  const commitFetches = selectedRepos.map(async (repo) => {
    try {
      const commits = await ghFetch<any[]>(
        `https://api.github.com/repos/${repo.full_name}/commits?author=${username}&since=${since}&per_page=100`
      );
      return { repo, commits };
    } catch {
      return { repo, commits: [] as any[] };
    }
  });

  const [repoCommits] = await Promise.all([
    Promise.all(commitFetches),
    Promise.all(langFetches),
  ]);

  // Language summary
  const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);
  if (totalBytes > 0) {
    const topLangs = Object.entries(langBytes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([lang, bytes]) => `${lang} ${Math.round((bytes / totalBytes) * 100)}%`)
      .join(" · ");
    lines.push(`### Language Breakdown\n${topLangs}\n`);
  }

  lines.push(`### Repositories\n`);

  // For repos with commits, pick a spread of representative commits across the year for synthesis
  const enrichedRepos = await Promise.all(
    repoCommits.map(async ({ repo, commits }) => {
      if (commits.length === 0) return { repo, commits, synthesis: null };
      const forSynthesis = selectRepresentativeCommits(commits, 5);

      // Fetch full commit data (includes file stats + patch)
      const fullCommits = await Promise.all(
        forSynthesis.map(async (c: any) => {
          try {
            return await ghFetch<any>(
              `https://api.github.com/repos/${repo.full_name}/commits/${c.sha}`
            );
          } catch {
            return null;
          }
        })
      );

      const synthesis = await synthesizeCommits(username, repo, fullCommits.filter(Boolean));
      return { repo, commits, synthesis };
    })
  );

  for (const { repo, commits, synthesis } of enrichedRepos) {
    const role = repo.fork ? "contributor (fork)" : "owner";
    const pushed = repo.pushed_at ? repo.pushed_at.slice(0, 10) : "";
    const created = repo.created_at ? repo.created_at.slice(0, 7) : "";

    lines.push(`#### ${repo.full_name} (${role})`);
    if (repo.description) lines.push(repo.description);

    const meta: string[] = [];
    if (repo.language) meta.push(`Primary language: ${repo.language}`);
    if (repo.stargazers_count) meta.push(`Stars: ${repo.stargazers_count}`);
    if (repo.forks_count) meta.push(`Forks: ${repo.forks_count}`);
    if (created) meta.push(`Created: ${created}`);
    if (pushed) meta.push(`Last pushed: ${pushed}`);
    if (repo.homepage) meta.push(`Live: ${repo.homepage}`);
    if (meta.length) lines.push(meta.join(" · "));

    if (synthesis) {
      lines.push(`\n*${synthesis}*`);
    }

    if (commits.length > 0) {
      const shown = commits.slice(0, 20);
      lines.push(`\nCommits by ${username} (last 12 months · ${commits.length} total${commits.length > 20 ? ", showing 20" : ""}):`);
      for (const c of shown) {
        const msg = c.commit.message.split("\n")[0];
        const date = c.commit.author?.date?.slice(0, 10) ?? "";
        const sha = c.sha?.slice(0, 7) ?? "";
        lines.push(`- \`${sha}\` ${msg} (${date})`);
      }
    } else {
      lines.push(`\nNo commits by ${username} in the last 12 months on default branch.`);
    }
    lines.push("");
  }

  // Cross-repo PR contributions via search
  try {
    const prSearch = await ghFetch<any>(
      `https://api.github.com/search/issues?q=author:${username}+type:pr+is:merged&per_page=10&sort=created&order=desc`
    );
    if (prSearch.items?.length > 0) {
      lines.push(`### Pull Requests (merged)\n`);
      for (const pr of prSearch.items.slice(0, 8)) {
        const repo = pr.repository_url?.replace("https://api.github.com/repos/", "") ?? "";
        const date = pr.closed_at?.slice(0, 10) ?? pr.created_at?.slice(0, 10) ?? "";
        lines.push(`- **${pr.title}** — ${repo} (${date})`);
        if (pr.body) {
          const excerpt = pr.body.replace(/\s+/g, " ").trim().slice(0, 120);
          if (excerpt) lines.push(`  > ${excerpt}...`);
        }
      }
      lines.push("");
    }
  } catch {}

  return lines.join("\n");
}

// ── Main export builder ──────────────────────────────────────────────────────

function buildProfileMarkdown(candidate: any, docs: any[], githubSection: string): string {
  const goals = candidate.goals ?? {};
  const lines: string[] = [];

  lines.push("---");
  lines.push(`name: ${candidate.name}`);
  lines.push(`exported: ${new Date().toISOString().split("T")[0]}`);
  lines.push("---\n");

  lines.push(`# ${candidate.name} — Profile\n`);

  if (goals.experience_level) {
    lines.push(`**Level:** ${goals.experience_level}`);
  }
  if (goals.industries) {
    lines.push(`**Industries:** ${goals.industries}`);
  }
  lines.push("");

  if (goals.summary || goals.career_trajectory) {
    lines.push(`## Career Arc\n`);
    lines.push((goals.summary || goals.career_trajectory) + "\n");
  }

  if (goals.skills) {
    lines.push(`## Skills\n`);
    lines.push(goals.skills + "\n");
  }

  if (goals.working_style || goals.communication_style) {
    lines.push(`## How I Work\n`);
    if (goals.working_style) lines.push(goals.working_style);
    if (goals.communication_style) lines.push(`\n*Communication:* ${goals.communication_style}`);
    lines.push("");
  }

  if (goals.values || goals.intellectual_interests) {
    lines.push(`## Values & Interests\n`);
    if (goals.values) lines.push(goals.values);
    if (goals.intellectual_interests) lines.push(`\n*Intellectual interests:* ${goals.intellectual_interests}`);
    lines.push("");
  }

  if (Array.isArray(goals.projects) && goals.projects.length > 0) {
    lines.push(`## Projects\n`);
    for (const p of goals.projects) {
      lines.push(`### ${p.title || "Untitled"}`);
      if (p.description) lines.push(p.description);
      const meta: string[] = [];
      if (p.role) meta.push(`Role: ${p.role}`);
      if (p.timeframe) meta.push(`Timeframe: ${p.timeframe}`);
      if (p.link) meta.push(`Link: ${p.link}`);
      if (meta.length) lines.push("\n" + meta.join(" · "));
      if (p.highlights) {
        lines.push("");
        p.highlights.split(",").map((b: string) => b.trim()).filter(Boolean)
          .forEach((b: string) => lines.push(`- ${b}`));
      }
      lines.push("");
    }
  }

  if (githubSection) {
    lines.push(githubSection);
  }

  if (goals.conversation_summary && goals.conversation_summary !== "no_questions_needed") {
    lines.push(`## From Kira's Conversation\n`);
    lines.push(goals.conversation_summary + "\n");
  }

  // Deduplicated source docs
  const seen = new Set<string>();
  const uniqueDocs = docs.filter((d) => {
    // Normalise: strip timestamps from generated filenames
    const key = d.filename.replace(/-\d{10,}\.md$/, ".md");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (uniqueDocs.length > 0) {
    lines.push(`## Sources (${uniqueDocs.length})\n`);
    for (const d of uniqueDocs) {
      lines.push(`- ${d.filename} (${d.docType})`);
    }
    lines.push("");
  }

  lines.push(`---\n*Generated ${new Date().toISOString()}*`);
  return lines.join("\n");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectGithubUsername(docs: any[]): string | null {
  for (const doc of docs) {
    // filename pattern: github-{username}.md
    const m = doc.filename.match(/^github-([^.]+)\.md$/);
    if (m) return m[1];
  }
  return null;
}

function sanitizeFilename(name: string): string {
  return (name || "candidate")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
