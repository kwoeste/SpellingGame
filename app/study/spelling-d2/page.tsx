import type { Metadata } from "next";
import { NotAllowed } from "@/components/NotAllowed";
import { SpellingD2 } from "@/components/SpellingD2";
import { D2_LIST } from "@/lib/spelling/catalog";
import { loadSpellingStudy } from "@/lib/spelling/study-page";

export const metadata: Metadata = { title: "Spelling List D-2 | Mae's Lab" };
export const dynamic = "force-dynamic";

export default async function SpellingD2Page() {
  const study = await loadSpellingStudy(D2_LIST.id);
  if (!study || !study.user) return <NotAllowed />;
  return <SpellingD2 list={study.list} testDate={study.testDate} daysLeft={study.daysLeft} preview={study.preview} rounds={study.rounds} />;
}
