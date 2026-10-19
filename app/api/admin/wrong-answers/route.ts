import { adminRead } from "@/lib/auth/admin-api";
import { adminRepo } from "@/lib/engine/repos";

export async function GET(req: Request) {
  return adminRead(req, async () => ({ wrong_answers: await adminRepo().wrongAnswers(500) }));
}
