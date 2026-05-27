import { promises as fs } from "fs";
import path from "path";
import { execFileSync } from "child_process";

const GITHUB_API_BASE = "https://api.github.com";

export function normalizeGithubHandle(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^github\.com\//i, "")
    .replace(/\s+/g, "")
    .replace(/\/$/, "");
}

async function fetchGithubJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${body}`);
  }
  return res.json();
}

export type GithubProfile = {
  login: string;
  name?: string;
  html_url: string;
  bio?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
};

export type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  updated_at: string;
  homepage: string | null;
  topics?: string[];
  default_branch: string;
};

export type GithubEvent = {
  id: string;
  type: string;
  repo: { name: string; url?: string };
  created_at: string;
  payload: Record<string, unknown>;
};

export type GithubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name?: string; email?: string; date?: string };
    committer?: { name?: string; email?: string; date?: string };
  };
};

export async function fetchGithubEvidence(username: string) {
  const profile = await fetchGithubJson<GithubProfile>(
    `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`
  );
  const repos = await fetchGithubJson<GithubRepo[]>(
    `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?per_page=8&sort=updated&type=owner`
  );
  const events = await fetchGithubJson<GithubEvent[]>(
    `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/events/public?per_page=30`
  );

  const selectedRepos = repos.slice(0, 4);

  const commitSummaries = await Promise.all(
    selectedRepos.map(async (repo) => {
      // Prefer using PyDriller helper if available for better representative commit selection
      try {
        const out = execFileSync(
          "./.venv/bin/python3",
          ["./scripts/pydriller_analyze.py", repo.full_name, username],
          {
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 15000,
          }
        );
        const parsed = JSON.parse(out);
        if (Array.isArray(parsed)) {
          // Map to GithubCommit-like shape for downstream markdown builder
          const commits = parsed.map((c: any) => ({
            sha: c.sha,
            html_url: `https://github.com/${repo.full_name}/commit/${c.sha}`,
            commit: {
              message: c.msg,
              author: { name: c.author, date: c.date },
            },
            diff_snippet: c.diff_snippet,
            added: c.added,
            removed: c.removed,
            files_changed: c.files_changed,
            is_merge: c.is_merge,
          } as unknown as GithubCommit));
          return { repo, commits };
        }
      } catch (err) {
        // fall back to GitHub API
      }

      try {
        const commits = await fetchGithubJson<GithubCommit[]>(
          `${GITHUB_API_BASE}/repos/${encodeURIComponent(repo.full_name)}/commits?author=${encodeURIComponent(username)}&per_page=5`
        );
        return { repo, commits: commits.slice(0, 5) };
      } catch {
        return { repo, commits: [] as GithubCommit[] };
      }
    })
  );

  const selectedEvents = events
    .filter((event) =>
      ["PullRequestEvent", "PullRequestReviewEvent", "PushEvent"].includes(
        event.type
      )
    )
    .slice(0, 5);

  return {
    profile,
    selectedRepos,
    commitSummaries,
    selectedEvents,
  };
}

function jsonBlock(value: unknown) {
  return "\n```json\n" + JSON.stringify(value, null, 2) + "\n```\n";
}

export function buildGithubMarkdown(
  username: string,
  evidence: Awaited<ReturnType<typeof fetchGithubEvidence>>
) {
  const timestamp = new Date().toISOString();
  const lines: string[] = [];

  lines.push("---");
  lines.push(`source_type: github_profile`);
  lines.push(`source_url: https://github.com/${username}`);
  lines.push(`capture_date: ${timestamp}`);
  lines.push(`tier: verified`);
  lines.push(
    `note: "Selected high-signal public GitHub artifacts for ${username}.`
  );
  lines.push("---\n");

  lines.push(`# GitHub evidence for ${username}`);
  lines.push(`
## Profile
`);
  lines.push(`- login: ${evidence.profile.login}`);
  if (evidence.profile.name) lines.push(`- name: ${evidence.profile.name}`);
  if (evidence.profile.bio) lines.push(`- bio: ${evidence.profile.bio}`);
  if (evidence.profile.company)
    lines.push(`- company: ${evidence.profile.company}`);
  if (evidence.profile.blog) lines.push(`- blog: ${evidence.profile.blog}`);
  if (evidence.profile.location)
    lines.push(`- location: ${evidence.profile.location}`);
  if (evidence.profile.email) lines.push(`- email: ${evidence.profile.email}`);
  lines.push(`- public repos: ${evidence.profile.public_repos}`);
  lines.push(`- followers: ${evidence.profile.followers}`);
  lines.push(`- following: ${evidence.profile.following}`);
  lines.push(`- created: ${evidence.profile.created_at}\n`);
  lines.push(`### Profile payload`);
  lines.push(jsonBlock(evidence.profile));

  if (evidence.selectedRepos.length > 0) {
    lines.push(`## Selected repositories\n`);
    for (const repo of evidence.selectedRepos) {
      lines.push(`### ${repo.full_name}`);
      lines.push(`- description: ${repo.description ?? "(none)"}`);
      lines.push(`- language: ${repo.language ?? "(none)"}`);
      lines.push(`- stars: ${repo.stargazers_count}`);
      lines.push(`- forks: ${repo.forks_count}`);
      lines.push(`- open issues: ${repo.open_issues_count}`);
      lines.push(`- last pushed: ${repo.pushed_at}`);
      lines.push(`- updated: ${repo.updated_at}`);
      lines.push(`- url: ${repo.html_url}\n`);
      lines.push(jsonBlock(repo));
    }
  }

  if (evidence.commitSummaries.length > 0) {
    lines.push(`## Representative commits\n`);
    for (const summary of evidence.commitSummaries) {
      const repo = summary.repo;
      if (summary.commits.length === 0) continue;
      lines.push(`### ${repo.full_name}`);
      for (const commit of summary.commits) {
        lines.push(`- commit: ${commit.sha}`);
        lines.push(`  - message: ${commit.commit.message.split("\n")[0]}`);
        lines.push(`  - url: ${commit.html_url}`);
        lines.push(`  - date: ${commit.commit.author?.date ?? "unknown"}`);
        lines.push(jsonBlock(commit));
      }
    }
  }

  if (evidence.selectedEvents.length > 0) {
    lines.push(`## Selected activity events\n`);
    for (const event of evidence.selectedEvents) {
      lines.push(`### ${event.type} — ${event.repo.name}`);
      lines.push(`- created_at: ${event.created_at}`);
      lines.push(`- repo: ${event.repo.name}`);
      lines.push(jsonBlock(event));
    }
  }

  return lines.join("\n");
}

export async function writeGithubMarkdownFile(
  candidateId: string,
  username: string,
  markdown: string
) {
  const directory = path.join(process.cwd(), "data", "github");
  await fs.mkdir(directory, { recursive: true });
  const filename = `${candidateId}-${username}.md`;
  const filePath = path.join(directory, filename);
  await fs.writeFile(filePath, markdown, "utf-8");
  return filePath;
}
