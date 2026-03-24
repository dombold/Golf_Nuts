import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(function proxy(req: NextRequest & { auth: { user?: unknown } | null }) {
  const isLoggedIn = !!req.auth?.user;
  const path = req.nextUrl.pathname;

  const isAuthRoute =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/reset-password");

  if (!isLoggedIn && !isAuthRoute) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|icon.svg|golf_nuts_badge.jpg|manifest.json|manifest.webmanifest|sw.js|.*\\.jpg|.*\\.png|.*\\.svg|.*\\.ico|.*\\.webp).*)",
  ],
};
