const USER_AGENT = "emper-ai-crawler/1.0";
const MAX_PAGES = 50;
const MAX_DEPTH = 25;
const PAGE_TIMEOUT_MS = 8000;
const CRAWL_TIMEOUT_MS = 60000;

export type CrawledPage = {
  url: string;
  title: string;
  text: string;
  markdown: string;
};

function extractLinks(html: string, baseUrl: URL): string[] {
  const links: string[] = [];
  const hrefRegex = /href=["']([^"'#?][^"']*?)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRegex.exec(html)) !== null) {
    try {
      const resolved = new URL(m[1], baseUrl);
      if (resolved.hostname === baseUrl.hostname && resolved.protocol.startsWith("http")) {
        resolved.search = "";
        resolved.hash = "";
        links.push(resolved.toString());
      }
    } catch {}
  }
  return links;
}

function extractTitle(html: string): string {
  const m = /<title>([\s\S]*?)<\/title>/i.exec(html);
  if (!m) return "";
  return m[1].replace(/\s+/g, " ").trim();
}

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

function buildPageMarkdown(url: string, title: string, text: string): string {
  const lines = [
    "---",
    `source_type: website`,
    `source_url: ${url}`,
    `capture_date: ${new Date().toISOString()}`,
    `tier: verified`,
    "---",
    "",
    `# ${title || url}`,
    "",
    "## Extracted text",
    "",
    text,
    "",
  ];
  return lines.join("\n");
}

async function fetchWithTimeout(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("text/plain")) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function crawlWebsite(rootUrl: string): Promise<CrawledPage[]> {
  let base: URL;
  try {
    base = new URL(rootUrl.startsWith("http") ? rootUrl : `https://${rootUrl}`);
  } catch {
    throw new Error(`Invalid URL: ${rootUrl}`);
  }

  const visited = new Set<string>();
  const queue: Array<{ url: string; depth: number }> = [{ url: base.toString(), depth: 0 }];
  const pages: CrawledPage[] = [];
  const crawlDeadline = Date.now() + CRAWL_TIMEOUT_MS;

  while (queue.length > 0 && pages.length < MAX_PAGES && Date.now() < crawlDeadline) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchWithTimeout(url);
    if (!html) continue;

    const title = extractTitle(html);
    const text = extractText(html);
    if (!text || text.length < 50) continue;

    const markdown = buildPageMarkdown(url, title, text);
    pages.push({ url, title, text, markdown });

    if (depth < MAX_DEPTH) {
      const links = extractLinks(html, base);
      for (const link of links) {
        if (!visited.has(link) && !queue.some((q) => q.url === link)) {
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  return pages;
}
