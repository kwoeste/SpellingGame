import { adminRead } from "@/lib/auth/admin-api";
import { loadOverview, loadProgress } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => {
    const [overview, progress] = await Promise.all([loadOverview(), loadProgress()]);
    return { daily: overview.daily, weeklyAccuracy: overview.weeklyAccuracy, trend: progress.trend, subjects: progress.subjects };
  });
}
