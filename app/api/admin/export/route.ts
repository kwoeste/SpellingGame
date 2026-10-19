import { adminRead } from "@/lib/auth/admin-api";
import { adminRepo } from "@/lib/engine/repos";

export async function GET(req: Request) {
  return adminRead(req, async () => {
    const repo = adminRepo();
    return { mastery: await repo.mastery(), events: await repo.events(5000), counts: await repo.counts() };
  });
}
