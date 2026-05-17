import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { users, candidates, companies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let profile = null;
  if (user.role === "candidate") {
    profile = await db.query.candidates.findFirst({
      where: eq(candidates.userId, user.id),
    });
  } else {
    profile = await db.query.companies.findFirst({
      where: eq(companies.userId, user.id),
    });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    onboardingComplete: user.onboardingComplete,
    profile,
  });
}
