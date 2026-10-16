import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getResolvedUser } from "@/lib/auth/users";
import { writeAudit } from "@/lib/auth/audit";

const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    async signIn({ user, profile }) {
      const email = (user.email ?? "").trim().toLowerCase();
      const verified =
        Boolean((profile as { email_verified?: boolean } | undefined)?.email_verified) ||
        Boolean((user as { emailVerified?: Date | null }).emailVerified);
      if (!email || !verified) {
        await writeAudit({
          userEmail: email || "unknown",
          role: "anonymous",
          route: "/api/auth/signin",
          method: "POST",
          status: 403,
          detail: "unverified_or_missing_email",
        });
        return false;
      }
      const resolved = getResolvedUser(email);
      if (!resolved) {
        await writeAudit({
          userEmail: email,
          role: "anonymous",
          route: "/api/auth/signin",
          method: "POST",
          status: 403,
          detail: "not_on_allowlist_or_role_drift",
        });
        return false;
      }
      return true;
    },
    async jwt({ token, user, profile }) {
      const email = (user?.email ?? token.email ?? "").toString().toLowerCase();
      if (email) {
        const resolved = getResolvedUser(email);
        token.email = email;
        token.role = resolved?.role ?? null;
        token.learnerId = resolved?.learnerId ?? null;
        token.userId = resolved?.id ?? null;
        token.emailVerified = Boolean(
          (profile as { email_verified?: boolean } | undefined)?.email_verified,
        );
      }
      return token;
    },
    async session({ session, token }) {
      session.user.email = (token.email as string) ?? session.user.email;
      session.user.role = (token.role as "student" | "admin" | null) ?? null;
      session.user.learnerId = (token.learnerId as string | null) ?? null;
      session.user.userId = (token.userId as string | null) ?? null;
      return session;
    },
  },
});
