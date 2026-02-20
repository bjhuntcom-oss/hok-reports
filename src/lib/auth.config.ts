import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }: any) {
      if (user) {
        token.role = user.role || "user";
        token.id = user.id;
      }
      if (account?.provider === "google" && profile) {
        token.picture = profile.picture;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        if (token.picture) session.user.image = token.picture;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }: any) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = ["/login", "/register"].some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      const isLegalPage = ["/mentions-legales", "/confidentialite", "/cgu"].some((p) =>
        nextUrl.pathname.startsWith(p)
      );
      const isDocsPage = nextUrl.pathname.startsWith("/platform-docs");
      const isPublic = isAuthPage || isLegalPage || isDocsPage;
      const isApi = nextUrl.pathname.startsWith("/api/");
      const isStatic =
        nextUrl.pathname.startsWith("/_next") ||
        nextUrl.pathname.startsWith("/icons") ||
        nextUrl.pathname === "/manifest.json" ||
        nextUrl.pathname === "/sw.js" ||
        nextUrl.pathname === "/favicon.ico";

      if (isStatic || isApi || isLegalPage) return true;

      if (!isLoggedIn && !isPublic) return false;

      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      if (
        nextUrl.pathname.startsWith("/admin") &&
        auth?.user?.role !== "admin"
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
};
