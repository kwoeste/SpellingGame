import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role: "student" | "admin" | null;
      learnerId: string | null;
      userId: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "student" | "admin" | null;
    learnerId?: string | null;
    userId?: string | null;
    emailVerified?: boolean;
  }
}
