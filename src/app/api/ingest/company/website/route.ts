import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { companies, companyDocuments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { crawlWebsite } from "@/lib/website-crawler";

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

  let pages;
  try {
    pages = await crawlWebsite(url);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Crawl failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (pages.length === 0) {
    return NextResponse.json({ error: "No pages found at that URL" }, { status: 422 });
  }

  let stored = 0;
  for (const page of pages) {
    try {
      const safeFilename = `website-${page.url
        .replace(/https?:\/\//i, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .slice(0, 180)}.md`;

      await db.insert(companyDocuments).values({
        companyId: company.id,
        filename: safeFilename,
        content: page.markdown.slice(0, 50000),
        docType: "website",
      });

      stored++;
    } catch {
      // skip pages that fail to store
    }
  }

  return NextResponse.json({ ok: true, pagesScraped: pages.length, pagesStored: stored });
}
