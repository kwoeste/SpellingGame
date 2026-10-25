import type { Metadata } from "next";
import { WrongAnswerTable } from "@/app/admin/_ui/wrong-answers";
import { catalogChapters, chapterDisplayName } from "@/lib/admin/catalog";
import { loadWrongAnswers } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Missed questions | Mae's Lab",
};

export default async function WrongAnswersPage() {
  const chapterLabels = Object.fromEntries(catalogChapters().map((c) => [c.id, chapterDisplayName(c)]));
  return <WrongAnswerTable data={await loadWrongAnswers()} chapterLabels={chapterLabels} />;
}
