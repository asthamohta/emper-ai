export async function parseFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return parsePDF(buffer);
  }

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }

  // For docx and other formats, return raw text extraction
  if (ext === "docx") {
    return parseDocx(buffer);
  }

  // Fallback: try to read as plain text
  return buffer.toString("utf-8");
}

async function parsePDF(buffer: Buffer): Promise<string> {
  // Dynamically import to avoid SSR issues
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    // Simple extraction: read raw XML from docx (zip file)
    // For production, use mammoth or similar
    const text = buffer.toString("utf-8");
    // Strip XML tags as a best-effort fallback
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

export function inferDocType(
  filename: string
): "resume" | "linkedin" | "sop" | "other" {
  const lower = filename.toLowerCase();
  if (lower.includes("resume") || lower.includes("cv")) return "resume";
  if (lower.includes("linkedin")) return "linkedin";
  if (lower.includes("sop") || lower.includes("statement")) return "sop";
  return "other";
}
