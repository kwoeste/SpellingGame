import type { Metadata } from "next";
import { NotAllowed } from "@/components/NotAllowed";
import { SpellingD2 } from "@/components/SpellingD2";
import { currentLoginId, requirePageUser } from "@/lib/auth/server";
import { engineRepo } from "@/lib/engine/repos";
import { spellingSession } from "@/lib/spelling/service";
import { SPELLING_D2_TEST_DATE } from "@/lib/practice/upcoming";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";
import { daysUntil } from "@/lib/spelling/engine";
import { LIST_HREF, LIST_ID } from "@/lib/spelling/list-d2";

export const metadata: Metadata = { title: "Spelling List D-2 | Mae's Lab" };
export const dynamic = "force-dynamic";

export default async function SpellingD2Page() {
  const user = await requirePageUser(["student", "admin"], LIST_HREF);
  if (!user) return <NotAllowed />;
  const tests = await loadUpcomingTests();
  const testDate = tests.find((t) => t.kind === "spelling" && t.refId === LIST_ID)?.testDate ?? SPELLING_D2_TEST_DATE;
  const loginId = await currentLoginId().catch(() => null);
  const session = await spellingSession(engineRepo(), user.learnerId, loginId).catch(() => null);
  return <SpellingD2 testDate={testDate} daysLeft={daysUntil(testDate, Date.now())} preview={!user.learnerId} rounds={session?.rounds ?? null} />;
}
