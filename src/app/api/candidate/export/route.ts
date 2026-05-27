import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, candidateDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  // Get all documents for context
  const docs = await db
    .select()
    .from(candidateDocuments)
    .where(eq(candidateDocuments.candidateId, candidate.id));

  // Build markdown profile
  const markdown = buildProfileMarkdown(candidate, docs);

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(candidate.name)}-profile-${new Date().toISOString().split("T")[0]}.md"`,
    },
  });
}

function buildProfileMarkdown(
  candidate: any,
  docs: any[]
) {
  const goals = candidate.goals ?? {};
  const lines: string[] = [];

  lines.push("---");
  lines.push(`name: ${candidate.name}`);
  lines.push(`id: ${candidate.id}`);
  lines.push(`created: ${candidate.createdAt}`);
  lines.push(`documents_count: ${docs.length}`);
  lines.push("---\n");

  // Basic info
  lines.push(`# ${candidate.name}'s Profile\n`);
  lines.push(`**Profile ID:** ${candidate.id}`);
  lines.push(`**Created:** ${new Date(candidate.createdAt).toLocaleDateString()}`);
  lines.push(`**Documents uploaded:** ${docs.length}\n`);

  // Experience level
  if (goals.experience_level) {
    lines.push(`## Experience Level\n`);
    lines.push(`${goals.experience_level}\n`);
  }

  // Skills
  if (goals.skills) {
    lines.push(`## Skills\n`);
    lines.push(`${goals.skills}\n`);
  }

  // Industries
  if (goals.industries) {
    lines.push(`## Industries\n`);
    lines.push(`${goals.industries}\n`);
  }

  // Career trajectory
  if (goals.career_trajectory) {
    lines.push(`## Career Trajectory\n`);
    lines.push(`${goals.career_trajectory}\n`);
  }

  // Working style
  if (goals.working_style || goals.communication_style) {
    lines.push(`## How I Work\n`);
    if (goals.working_style) lines.push(`${goals.working_style}\n`);
    if (goals.communication_style) lines.push(`**Communication:** ${goals.communication_style}\n`);
  }

  // Values & interests
  if (goals.values || goals.intellectual_interests) {
    lines.push(`## Values & Interests\n`);
    if (goals.values) lines.push(`${goals.values}\n`);
    if (goals.intellectual_interests) lines.push(`**Intellectual interests:** ${goals.intellectual_interests}\n`);
  }

  // Projects (structured)
  if (Array.isArray(goals.projects) && goals.projects.length > 0) {
    lines.push(`## Projects\n`);
    goals.projects.forEach((p: any, idx: number) => {
      lines.push(`### ${p.title || `Project ${idx + 1}`}\n`);
      if (p.description) lines.push(`${p.description}\n`);
      const meta: string[] = [];
      if (p.role) meta.push(`Role: ${p.role}`);
      if (p.timeframe) meta.push(`Timeframe: ${p.timeframe}`);
      if (p.link) meta.push(`Link: ${p.link}`);
      if (meta.length) lines.push(meta.join(" • ") + "\n");
      if (p.highlights) {
        const bullets = p.highlights.split(",").map((b: string) => `- ${b.trim()}`);
        lines.push(bullets.join("\n") + "\n");
      }
    });
  }

  // Job preferences
  if (goals.comp_expectations) {
    lines.push(`## Compensation Expectations\n`);
    lines.push(`${goals.comp_expectations}\n`);
  }

  if (goals.company_stage) {
    lines.push(`## Preferred Company Stage\n`);
    lines.push(`${goals.company_stage}\n`);
  }

  if (goals.sector_constraints) {
    lines.push(`## Sector Constraints\n`);
    lines.push(`${goals.sector_constraints}\n`);
  }

  // Documents summary
  if (docs.length > 0) {
    lines.push(`## Source Documents\n`);
    for (const doc of docs) {
      lines.push(`- **${doc.filename}** (${doc.docType})`);
    }
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`*Generated on ${new Date().toISOString()}*`);

  return lines.join("\n");
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}
