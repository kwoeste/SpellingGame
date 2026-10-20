import { adminRead } from "@/lib/auth/admin-api";
import { loadSessions } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => ({ sessions: (await loadSessions()).sessions }));
}
