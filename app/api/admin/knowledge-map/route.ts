import { adminRead } from "@/lib/auth/admin-api";
import { loadKnowledgeMap } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => ({ map: await loadKnowledgeMap() }));
}
