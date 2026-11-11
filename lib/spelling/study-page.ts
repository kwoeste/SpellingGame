import { currentLoginId, requirePageUser } from "@/lib/auth/server";
import { engineRepo } from "@/lib/engine/repos";
import { SPELLING_D2_TEST_DATE } from "@/lib/practice/upcoming";
import { loadUpcomingTests } from "@/lib/practice/upcoming-store";
import { spellingList, type SpellingList } from "@/lib/spelling/catalog";
import { daysUntil } from "@/lib/spelling/engine";
import { LIST_ID as D2_ID } from "@/lib/spelling/list-d2";
import { spellingSession } from "@/lib/spelling/service";
import type { SessionRound } from "@/lib/spelling/mix";

export type SpellingStudy = {
  list: SpellingList;
  user: null;
} | {
  list: SpellingList;
  user: NonNullable<Awaited<ReturnType<typeof requirePageUser>>>;
  testDate: string | null;
  daysLeft: number | null;
  preview: boolean;
  rounds: SessionRound[] | null;
};

/** Shared loader for a spelling study page. Missing D-2 row keeps its configured test date; a missing date stays null. */
export async function loadSpellingStudy(listId: string): Promise<SpellingStudy | null> {
  const list = spellingList(listId);
  if (!list) return null;
  const user = await requirePageUser(["student", "admin"], list.href);
  if (!user) return { list, user: null };
  const tests = await loadUpcomingTests();
  const row = tests.find((t) => t.kind === "spelling" && t.refId === list.id);
  const testDate = row ? row.testDate : list.id === D2_ID ? SPELLING_D2_TEST_DATE : null;
  const loginId = await currentLoginId().catch(() => null);
  const session = await spellingSession(engineRepo(), user.learnerId, loginId, Date.now(), list.id).catch(() => null);
  return {
    list,
    user,
    testDate,
    daysLeft: testDate ? daysUntil(testDate, Date.now()) : null,
    preview: !user.learnerId,
    rounds: session?.rounds ?? null,
  };
}
