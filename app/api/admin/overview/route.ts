import { adminRead } from "@/lib/auth/admin-api";
import { loadOverview } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => ({ overview: await loadOverview() }));
}
