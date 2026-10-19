import { signIn } from "@/lib/auth/config";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const params = await searchParams;
  const from = params.from || "/study";
  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 460, margin: "40px auto" }}>
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
        <p style={{ color: "var(--soft)", fontSize: "0.9rem" }}>
          If your account is not on the list, you will stay on the public shop.
        </p>
      </div>
    </div>
  );
}
