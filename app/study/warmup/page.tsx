import type { Metadata } from "next";
import { NotAllowed } from "@/components/NotAllowed";
import { WarmUp } from "@/components/WarmUp";
import { requirePageUser } from "@/lib/auth/server";
import { engineRepo } from "@/lib/engine/repos";
import { warmupEntries } from "@/lib/engine/warmup";

export const metadata: Metadata = { title: "Warm-up | Mae's Lab" };
export const dynamic = "force-dynamic";

export default async function WarmUpPage() {
  const user = await requirePageUser(["student", "admin"], "/study/warmup");
  if (!user) return <NotAllowed />;
  const entries = await warmupEntries(engineRepo(), { role: user.role, learnerId: user.learnerId }).catch(() => []);
  return (
    <div className="kid-shell">
      <p className="kid-kicker">Warm-up</p>
      <h1 style={{ marginTop: 0 }}>Quick review</h1>
      <p>A few questions from earlier chapters. Remembering them makes them stick.</p>
      <WarmUp entries={entries} />
    </div>
  );
}
