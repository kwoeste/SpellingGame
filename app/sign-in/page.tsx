import { signIn } from "@/lib/auth/config";
import { Mascot } from "@/components/ui/Mascot";

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
        >
          <button className="btn" type="submit">
            Continue with Google
          </button>
        </form>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem", fontWeight: 700 }}>
          If your account is not on the list, you will stay on the public shop.
        </p>
      </div>
    </div>
  );
}
