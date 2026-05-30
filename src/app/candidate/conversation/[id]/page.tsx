/**
 * Candidate-facing conversation viewer.
 *
 * Renders the full Python-pipeline transcript + judge verdict for a single
 * match. This is the page the demo links to from the Intros panel when the
 * candidate (or the demoer) wants to see HOW the verdict was reached —
 * especially the walk-away case where the conversation surfaces real
 * friction.
 *
 * Visual language matches the rest of the candidate workspace (serif headings,
 * monospace metadata, dark theme).
 */

import { notFound } from "next/navigation";

import { ConversationView } from "./view";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ id: string }> };

export default async function ConversationPage({ params }: RouteParams) {
  const { id } = await params;

  // Fetch via the same auth-protected API the client would use. The
  // middleware already gates /candidate/* so we know there's a session.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/match/conversation/${id}`, {
    cache: "no-store",
    headers: { cookie: await readCookieHeader() },
  });

  if (res.status === 404) notFound();
  if (!res.ok) {
    throw new Error(`Failed to load conversation: ${res.status}`);
  }

  const data = await res.json();
  return <ConversationView data={data} />;
}

async function readCookieHeader(): Promise<string> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  return store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}
