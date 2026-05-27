import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { companies, companyDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { fetchPageHtml, normalizeSourceUrl } from "@/lib/source-scraper";

function extractText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim()
    .slice(0, 15000);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "company") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const company = await db.query.companies.findFirst({
    where: eq(companies.userId, session.userId),
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = (body as { url?: unknown }).url;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const normalized = normalizeSourceUrl(url);
  if (!normalized) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let html: string;
  try {
    html = await fetchPageHtml(normalized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const text = extractText(html);
  if (!text || text.length < 50) {
    return NextResponse.json({ error: "No readable content found at that URL" }, { status: 422 });
  }

  const markdown = [
    "---",
    `source_type: jd`,
    `source_url: ${normalized}`,
    `capture_date: ${new Date().toISOString()}`,
    "---",
    "",
    `# Job Description — ${normalized}`,
    "",
    text,
  ].join("\n");

  const safeFilename = `jd-${normalized
    .replace(/https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(0, 180)}.md`;

  await db.insert(companyDocuments).values({
    companyId: company.id,
    filename: safeFilename,
    content: markdown.slice(0, 50000),
    docType: "jd",
  });

  return NextResponse.json({ ok: true, text: text.slice(0, 2000) });
}
