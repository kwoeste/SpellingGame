import { adminRead } from "@/lib/auth/admin-api";
import { loadWrongAnswers } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => {
    const view = await loadWrongAnswers();
    return { wrong_answers: view.rows, patterns: view.patterns };
  });
}
