import { WrongAnswerTable } from "@/app/admin/_ui/wrong-answers";
import { loadWrongAnswers } from "@/lib/admin/load";

export default async function WrongAnswersPage() {
  return <WrongAnswerTable data={await loadWrongAnswers()} />;
}
