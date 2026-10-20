import { adminRead } from "@/lib/auth/admin-api";
import { loadOverview, loadSessions } from "@/lib/admin/load";

export async function GET(req: Request) {
  return adminRead(req, async () => {
    const [overview, sessions] = await Promise.all([loadOverview(), loadSessions()]);
    return {
      engaged_minutes_by_day: overview.daily.map((day) => ({ day: day.day, minutes: day.minutes })),
      sessions: sessions.sessions,
    };
  });
}
