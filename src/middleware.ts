import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

const CANDIDATE_PATHS = ["/candidate"];
const COMPANY_PATHS = ["/company"];
const AUTH_PATHS = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("emper_token")?.value;
  const session = token ? await verifyToken(token) : null;

  // Redirect logged-in users away from auth pages
  if (AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    if (session) {
      return NextResponse.redirect(
        new URL(`/${session.role}/dashboard`, request.url)
      );
    }
    return NextResponse.next();
  }

  // Protect candidate routes
  if (CANDIDATE_PATHS.some((p) => pathname.startsWith(p))) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role !== "candidate") {
      return NextResponse.redirect(new URL("/company/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protect company routes
  if (COMPANY_PATHS.some((p) => pathname.startsWith(p))) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (session.role !== "company") {
      return NextResponse.redirect(
        new URL("/candidate/dashboard", request.url)
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/candidate/:path*",
    "/company/:path*",
    "/login",
    "/signup",
  ],
};
