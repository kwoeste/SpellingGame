import { adminRead } from "@/lib/auth/admin-api";
import { adminRepo } from "@/lib/engine/repos";

export async function GET(req: Request) {
  return adminRead(req, async () => ({ engaged_minutes_by_day: await adminRepo().engagedMinutesByDay() }));
}
