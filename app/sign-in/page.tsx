import type { Metadata } from "next";
import { signIn } from "@/lib/auth/config";
import { Mascot } from "@/components/ui/Mascot";

export const metadata: Metadata = {
  title: "Sign in | Mae's Lab",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const from = params.from || "/study";
  return (
    <div className="kid-shell">
      <div className="card" style={{ maxWidth: 480, margin: "40px auto", textAlign: "center" }}>
        <Mascot mood="idle" size={100} />
        <h1>Sign in</h1>
        <p>Games, spelling, the count game, and Study need a signed-in Google account on the family allowlist.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: from });
          }}
          style={{ marginTop: 24 }}
        >
          <button
            className="btn"
            type="submit"
            style={{
              fontSize: "1.25rem",
              padding: "16px 32px",
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem", fontWeight: 700, marginTop: 16 }}>
          If your account is not on the list, you will stay on the public shop.
        </p>
      </div>
    </div>
  );
}
