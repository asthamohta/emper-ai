import { getAnthropic } from "./claude";
import { fetchGithubEvidence } from "./github-scraper";
import { embedBatch, serializeEmbedding, cosineSimilarity } from "./embeddings";
import { db } from "@/db";
import { candidateDocuments, candidateChunks } from "@/db/schema";
import { chunkText } from "./utils";
import fs from "fs/promises";
import path from "path";
import { eq } from "drizzle-orm";

const MODEL = "claude-sonnet-4-6";

export async function synthesizeProjectsForCandidate(
  candidateId: string,
  username: string,
  similarityThreshold = 0.9
) {
  const evidence = await fetchGithubEvidence(username);

  const projectSummaries: any[] = [];

  for (const repo of evidence.selectedRepos) {
    // fetch README via raw GitHub API
    let readme = "";
    try {
      const res = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(repo.full_name)}/readme`,
        {
          headers: {
            Accept: "application/vnd.github.v3.raw",
            ...(process.env.GITHUB_TOKEN
              ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
              : {}),
          },
        }
      );
      if (res.ok) readme = await res.text();
    } catch {}

    // fetch languages
    let languages: Record<string, number> = {};
    try {
      const langRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(repo.full_name)}/languages`,
        { headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {} }
      );
      if (langRes.ok) languages = await langRes.json();
    } catch {}

    const commits = (evidence.commitSummaries.find((s: any) => s.repo.full_name === repo.full_name)?.commits) ?? [];

    // Build prompt
    const prompt = `You are an expert software engineer and technical evaluator. Given the repo metadata, README (first 2000 chars), top languages, and up to 5 representative commits (sha, message, diff snippet), extract a structured JSON object describing the project and 2-4 unique, evidence-backed insights. Include for each insight a provenance pointer (commit sha or README) and a one-line highlight. Output only valid JSON.

Repo metadata:
${JSON.stringify({ full_name: repo.full_name, description: repo.description, html_url: repo.html_url, languages })}

README (truncated):
${readme.slice(0, 2000)}

Commits:
${JSON.stringify(commits.slice(0, 5))}

Return JSON schema:
{
  "project": {
    "repo": "owner/repo",
    "title": "short title",
    "description": "one paragraph",
    "role_inferred": "owner|maintainer|contributor",
    "timeframe": "dates or inferred",
    "link": "url",
    "tech_stack": ["Go","TS"],
    "importance": "core product|infra|tooling|example",
    "skills_demonstrated": ["systems-design","api-design"],
    "level_assessment": { "level": "senior|mid|junior", "confidence": 0.0 }
  },
  "insights": [
    { "text": "concise insight", "provenance": "commit:SHA or README:line", "fingerprint": "" }
  ]
}
`;

    const message = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: `You are a concise technical summarizer. Produce JSON only.`,
      messages: [{ role: "user", content: prompt }],
    });

    let parsed: any = null;
    try {
      const text = message.content[0].type === "text" ? message.content[0].text : "";
      const match = text.match(/\{[\s\S]*\}$/);
      if (match) parsed = JSON.parse(match[0]);
      else parsed = JSON.parse(text);
    } catch (err) {
      parsed = null;
    }

    if (!parsed || !parsed.project) continue;

    // Compute embeddings for insights text
    const insightTexts = (parsed.insights || []).map((i: any) => i.text || "");
    const insightEmbeddings = insightTexts.length > 0 ? await embedBatch(insightTexts) : [];

    // Load existing embeddings for candidate to dedupe
    const existingRows = await db.select().from(candidateChunks).where(eq(candidateChunks.candidateId, candidateId));
    const existingEmbeddings = existingRows.map((r: any) => {
      try { return JSON.parse(r.embedding) as number[]; } catch { return null; }
    }).filter(Boolean) as number[][];

    const newInsights: any[] = [];
    for (let i = 0; i < insightTexts.length; i++) {
      const emb = insightEmbeddings[i];
      let duplicate = false;
      for (const e of existingEmbeddings) {
        const sim = cosineSimilarity(emb, e);
        if (sim >= similarityThreshold) { duplicate = true; break; }
      }
      if (!duplicate) {
        const insight = parsed.insights[i];
        insight.fingerprint = `fp:${repo.full_name}:${Math.abs(hashString(insight.text)).toString(16)}`;
        newInsights.push(insight);
      }
    }

    if (newInsights.length > 0) {
      parsed.insights = newInsights;
      projectSummaries.push(parsed);
    }
  }

  if (projectSummaries.length === 0) return { ok: true, projects: [] };

  // Build markdown
  const lines: string[] = [];
  lines.push("---");
  lines.push(`source_type: github_projects`);
  lines.push(`source_for: ${username}`);
  lines.push(`capture_date: ${new Date().toISOString()}`);
  lines.push("---\n");
  lines.push(`# Extracted GitHub Projects for ${username}\n`);

  for (const ps of projectSummaries) {
    const p = ps.project;
    lines.push(`## ${p.title || p.repo}`);
    if (p.description) lines.push(p.description + "\n");
    const meta: string[] = [];
    if (p.role_inferred) meta.push(`Role: ${p.role_inferred}`);
    if (p.timeframe) meta.push(`Timeframe: ${p.timeframe}`);
    if (p.link) meta.push(`Link: ${p.link}`);
    if (p.tech_stack) meta.push(`Tech: ${p.tech_stack.join(", ")}`);
    if (meta.length) lines.push(meta.join(" • ") + "\n");
    if (ps.insights && ps.insights.length) {
      lines.push(`### Insights\n`);
      for (const ins of ps.insights) {
        lines.push(`- ${ins.text}  `);
        if (ins.provenance) lines.push(`  - provenance: ${ins.provenance}`);
        if (ins.fingerprint) lines.push(`  - fingerprint: ${ins.fingerprint}`);
      }
      lines.push("");
    }
  }

  const markdown = lines.join("\n");

  // persist file and DB rows
  const directory = path.join(process.cwd(), "data", "github-projects");
  await fs.mkdir(directory, { recursive: true });
  const filename = `github-projects-${username}-${Date.now()}.md`;
  const filePath = path.join(directory, filename);
  await fs.writeFile(filePath, markdown, "utf8");

  const [doc] = await db.insert(candidateDocuments).values({
    candidateId,
    filename,
    content: markdown.slice(0, 50000),
    docType: "github",
  }).returning();

  const chunks = chunkText(markdown, 400, 50).slice(0, 20);
  if (chunks.length > 0) {
    const embeddings = await embedBatch(chunks);
    const rows = chunks.map((chunk, i) => ({
      candidateId,
      documentId: doc.id,
      content: chunk,
      embedding: serializeEmbedding(embeddings[i]),
    }));
    await db.insert(candidateChunks).values(rows);
  }

  return { ok: true, projects: projectSummaries, filename, filePath };
}

function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
