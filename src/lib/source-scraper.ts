import { promises as fs } from "fs";
import * as path from "path";

export type SourceType = "website" | "portfolio" | "paper";

const USER_AGENT = "emper-ai-source-scraper/1.0";
const MAX_TEXT_LENGTH = 20000;

export function normalizeSourceUrl(input: string): string {
  try {
    return new URL(input.trim()).toString();
  } catch {
    try {
      return new URL(`https://${input.trim()}`).toString();
    } catch {
      return "";
    }
  }
}

export async function fetchPageHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return await res.text();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTagContent(html: string, regex: RegExp): string {
  const match = regex.exec(html);
  if (!match) return "";
  return decodeHtmlEntities(match[1].trim());
}

function extractMetaTags(html: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const metaTagRegex = /<meta\s+([^>]+)>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaTagRegex.exec(html))) {
    const attrs = match[1];
    const keyMatch = /(?:name|property)=['"]([^'"]+)['"]/i.exec(attrs);
    const contentMatch = /content=['"]([^'"]+)['"]/i.exec(attrs);
    if (keyMatch && contentMatch) {
      metadata[keyMatch[1].toLowerCase()] = decodeHtmlEntities(contentMatch[1].trim());
    }
  }

  const title = extractTagContent(html, /<title>([\s\S]*?)<\/title>/i);
  if (title) metadata.title = title;

  return metadata;
}

function extractTextFromHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return decodeHtmlEntities(text);
}

function findAbstract(text: string): string {
  const lowered = text.toLowerCase();
  const abstractIndex = lowered.indexOf("abstract");
  if (abstractIndex < 0) {
    return "";
  }

  const snippet = text.slice(abstractIndex, abstractIndex + 4500);
  const endMarker = snippet.search(/(introduction|keywords|1\.|\n\n|\r\r)/i);
  if (endMarker > 0) {
    return snippet.slice(0, endMarker).trim();
  }

  return snippet.trim();
}

function buildSourceMarkdown(
  sourceType: SourceType,
  url: string,
  metadata: Record<string, string>,
  text: string,
  abstract: string
) {
  const timestamp = new Date().toISOString();
  const noteMap: Record<SourceType, string> = {
    website: "Selected high-signal website page text and metadata for audit and signal extraction.",
    portfolio: "Selected portfolio/project walkthrough evidence including page metadata and extracted text.",
    paper: "Research paper metadata, abstract, and page text extracted for evidence and signal generation.",
  };

  const lines: string[] = [
    "---",
    `source_type: ${sourceType}`,
    `source_url: ${url}`,
    `capture_date: ${timestamp}`,
    "tier: verified",
    `note: "${noteMap[sourceType]}"`,
    "---",
    "",
    `# ${sourceType === "paper" ? "Research paper" : sourceType === "portfolio" ? "Portfolio" : "Website"} evidence for ${url}`,
    "",
    "## Metadata",
  ];

  if (Object.keys(metadata).length === 0) {
    lines.push("- (no metadata found)");
  } else {
    for (const [key, value] of Object.entries(metadata)) {
      lines.push(`- ${key}: ${value}`);
    }
  }

  lines.push("", "### Raw metadata", "```json", JSON.stringify(metadata, null, 2), "```", "");

  if (sourceType === "paper") {
    lines.push("## Abstract");
    if (abstract) {
      lines.push("```text", abstract, "```");
    } else {
      lines.push("- Could not identify an abstract with the current scraper heuristics.");
    }
    lines.push("");
  }

  lines.push("## Extracted text", "```text", text, "```", "");
  return lines.join("\n");
}

function normalizeFilename(value: string): string {
  return value
    .replace(/https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

export async function scrapeSource(
  inputUrl: string,
  sourceType: SourceType
): Promise<{ markdown: string; docType: SourceType; filename: string }> {
  const url = normalizeSourceUrl(inputUrl);
  if (!url) {
    throw new Error(`Invalid URL: ${inputUrl}`);
  }

  const html = await fetchPageHtml(url);
  const metadata = extractMetaTags(html);
  const text = extractTextFromHtml(html).slice(0, MAX_TEXT_LENGTH);
  const abstract = sourceType === "paper" ? findAbstract(text) : "";
  const markdown = buildSourceMarkdown(sourceType, url, metadata, text, abstract);
  const filename = `${sourceType}-${normalizeFilename(url)}.md`;
  return { markdown, docType: sourceType, filename };
}

export async function writeSourceMarkdownFile(
  candidateId: string,
  filename: string,
  markdown: string
) {
  const directory = path.join(process.cwd(), "data", "sources");
  await fs.mkdir(directory, { recursive: true });
  const filePath = path.join(directory, `${candidateId}-${filename}`);
  await fs.writeFile(filePath, markdown, "utf-8");
  return filePath;
}
