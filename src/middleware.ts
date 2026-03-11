import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth(async function middleware(req: NextRequest & { auth?: any }) {
  const response = NextResponse.next();

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");

  // Block unauthenticated access to admin API routes
  if (req.nextUrl.pathname.startsWith("/api/admin")) {
    if (!req.auth?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    if (req.auth.user.role !== "admin") {
      return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
    }
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json).*)"],
};
