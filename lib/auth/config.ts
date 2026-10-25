import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { envRoleForEmail } from "@/lib/auth/allowlist";
import { resolveUser } from "@/lib/auth/users";
import { writeAudit } from "@/lib/auth/audit";

const googleId = process.env.AUTH_GOOGLE_ID ?? process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET ?? process.env.GOOGLE_CLIENT_SECRET;

const STUDENT_SESSION_SECONDS = 30 * 24 * 60 * 60;
const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  session: { strategy: "jwt", maxAge: STUDENT_SESSION_SECONDS },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    async signIn({ user, profile }) {
      const email = (user.email ?? "").trim().toLowerCase();
      const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
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
      const resolved = await resolveUser(email);
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
    /**
     * Identity is resolved against Postgres once, at sign-in. Later calls (including from Edge
     * middleware) only re-check the env allowlist and the admin 8-hour limit; route handlers and
     * server layouts re-resolve the user on every request.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        const resolved = await resolveUser(email);
        if (!resolved) return null;
        token.email = email;
        token.role = resolved.role;
        token.learnerId = resolved.learnerId;
        token.userId = resolved.id;
        token.signedInAt = Date.now();
        return token;
      }
      const email = typeof token.email === "string" ? token.email : "";
      if (!email || !token.role || envRoleForEmail(email) !== token.role) return null;
      if (token.role === "admin" && Date.now() - Number(token.signedInAt ?? 0) > ADMIN_SESSION_MS) return null;
      return token;
    },
    async session({ session, token }) {
      session.user.email = (token.email as string) ?? session.user.email;
      session.user.role = (token.role as "student" | "admin" | null) ?? null;
      session.user.learnerId = (token.learnerId as string | null) ?? null;
      session.user.userId = (token.userId as string | null) ?? null;
      // One value per Google sign-in; Today's plan is regenerated only when this changes.
      session.user.loginId = token.signedInAt ? `login-${Number(token.signedInAt)}` : null;
      return session;
    },
  },
});
