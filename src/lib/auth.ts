import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { authConfig } from "./auth.config";
import { logAudit } from "./audit";
import { rateLimit } from "./rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any) {
        try {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const rl = rateLimit(`login:${email}`, 5, 300000);
        if (!rl.allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          console.error("[AUTH] User not found or no password for:", email);
          return null;
        }
        if (user.blocked || user.status !== "active") {
          console.error("[AUTH] User blocked or not active:", email, user.status, user.blocked);
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          console.error("[AUTH] Invalid password for:", email);
          return null;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        logAudit({ userId: user.id, action: "login", entity: "user", entityId: user.id, details: { method: "credentials" } }).catch(() => {});

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.avatar,
        };
        } catch (error) {
          console.error("[AUTH] authorize error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }: any) {
      if (account?.provider === "google") {
        const email = user.email;
        if (!email) return false;

        let dbUser = await prisma.user.findUnique({
          where: { email },
        });

        if (dbUser) {
          if (dbUser.blocked || dbUser.status !== "active") return false;
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              lastLoginAt: new Date(),
              avatar: user.image || dbUser.avatar,
            },
          });
          user.id = dbUser.id;
          user.role = dbUser.role;
          logAudit({ userId: dbUser.id, action: "login", entity: "user", entityId: dbUser.id, details: { method: "google" } }).catch(() => {});
        } else {
          dbUser = await prisma.user.create({
            data: {
              name: user.name || email.split("@")[0],
              email,
              avatar: user.image,
              role: "user",
              status: "pending",
              language: "fr",
            },
          });
          user.id = dbUser.id;
          user.role = dbUser.role;
          logAudit({ userId: dbUser.id, action: "register", entity: "user", entityId: dbUser.id, details: { method: "google" } }).catch(() => {});
          return "/register?pending=true";
        }
      }
      return true;
    },
    async jwt({ token, user, account }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role || "user";
      }
      if (account?.provider === "google" && user) {
        token.picture = user.image;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        if (token.picture) session.user.image = token.picture;
      }
      return session;
    },
  },
});
