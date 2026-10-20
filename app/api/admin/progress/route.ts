import { adminRead } from "@/lib/auth/admin-api";
import { loadProgress } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => ({ progress: await loadProgress() }));
}
