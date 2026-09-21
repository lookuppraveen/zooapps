import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { RoleKey } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Simulated login for the demo (D4).
 *
 * Anyone who knows a seeded email can sign in — no password is validated.
 * The seeded users are one-per-role, so the login page doubles as a
 * role-picker that proves RBAC end-to-end.
 *
 * The Credentials provider is the only integration point; swapping in Okta
 * (or another real IdP) is a one-file change to `providers`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      name: "Demo",
      credentials: {
        email: { label: "Email", type: "email" },
      },
      async authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        if (!email) return null;
        const user = await db.user.findUnique({
          where: { email },
          include: { role: { select: { key: true, name: true } } },
        });
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.key,
          roleName: user.role.name,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id as string;
        token.role = (user as { role: RoleKey }).role;
        token.roleName = (user as { roleName: string }).roleName;
      }
      // Support demo role-switching from the client without a full re-login.
      if (trigger === "update" && session && typeof session === "object") {
        const s = session as { role?: RoleKey; roleName?: string; userId?: string };
        if (s.userId) token.userId = s.userId;
        if (s.role) token.role = s.role;
        if (s.roleName) token.roleName = s.roleName;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as RoleKey;
        session.user.roleName = token.roleName as string;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      const isAuthPage = path.startsWith("/login");
      if (isAuthPage) return true;
      return !!session;
    },
  },
});
