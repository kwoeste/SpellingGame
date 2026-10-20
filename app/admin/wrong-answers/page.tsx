import type { Metadata } from "next";
import { WrongAnswerTable } from "@/app/admin/_ui/wrong-answers";
import { loadWrongAnswers } from "@/lib/admin/load";

export const metadata: Metadata = {
  title: "Admin · Wrong Answers | Mae's Lab",
};

export default async function WrongAnswersPage() {
  return <WrongAnswerTable data={await loadWrongAnswers()} />;
}
