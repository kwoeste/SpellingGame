import type { Metadata } from "next";
import { NotAllowed } from "@/components/NotAllowed";
import { SpellingD2 } from "@/components/SpellingD2";
import { U2L10_LIST } from "@/lib/spelling/catalog";
import { loadSpellingStudy } from "@/lib/spelling/study-page";

export const metadata: Metadata = { title: "Middle Ages words | Mae's Lab" };
export const dynamic = "force-dynamic";

export default async function SpellingU2L10Page() {
  const study = await loadSpellingStudy(U2L10_LIST.id);
  if (!study || !study.user) return <NotAllowed />;
  return <SpellingD2 list={study.list} testDate={study.testDate} daysLeft={study.daysLeft} preview={study.preview} rounds={study.rounds} />;
}
