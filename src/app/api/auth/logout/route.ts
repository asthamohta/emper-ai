import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("emper_token");
  return response;
}

export async function GET() {
  const response = NextResponse.redirect("http://localhost:3000/login");
  response.cookies.delete("emper_token");
  return response;
}
