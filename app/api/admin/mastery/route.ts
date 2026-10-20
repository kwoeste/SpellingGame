import { adminRead } from "@/lib/auth/admin-api";
import { loadKnowledgeMap } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => {
    const map = await loadKnowledgeMap();
    return { mastery: map.nodes, edges: map.edges, frontiers: map.frontiers };
  });
}
