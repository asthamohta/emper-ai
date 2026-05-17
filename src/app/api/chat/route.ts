import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { candidates, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { streamGoalsChat } from "@/lib/claude";
import { z } from "zod";

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  saveGoals: z.record(z.string()).optional(),
});

export async function POST(request: Request) {
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

  const body = await request.json();
  const { messages, saveGoals } = schema.parse(body);

  // If saving final goals
  if (saveGoals) {
    await db
      .update(candidates)
      .set({ goals: { ...(candidate.goals as object), ...saveGoals } })
      .where(eq(candidates.id, candidate.id));

    await db
      .update(users)
      .set({ onboardingComplete: true })
      .where(eq(users.id, session.userId));

    return NextResponse.json({ ok: true });
  }

  // Stream chat response
  const extractedProfile = JSON.stringify(candidate.goals ?? {});
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of streamGoalsChat(messages, extractedProfile)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        console.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
