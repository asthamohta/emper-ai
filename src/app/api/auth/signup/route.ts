import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { users, candidates, companies } from "@/db/schema";
import { hashPassword, signToken } from "@/lib/auth";
import { eq } from "drizzle-orm";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["candidate", "company"]),
  name: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, role, name } = schema.parse(body);

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, role })
      .returning();

    if (role === "candidate") {
      await db.insert(candidates).values({ userId: user.id, name });
    } else {
      await db.insert(companies).values({ userId: user.id, name });
    }

    const token = await signToken({ userId: user.id, email, role });

    const response = NextResponse.json({ ok: true, role });
    response.cookies.set("emper_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
