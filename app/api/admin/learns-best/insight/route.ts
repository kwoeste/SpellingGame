import { adminWrite } from "@/lib/auth/admin-api";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { adminRepo } from "@/lib/engine/repos";
import { generateInsight } from "@/lib/engine/learning-insight";

export const maxDuration = 30;

/** Admin button: refresh "how Mae learns best" now (capped per day; falls back without a key). */
export async function POST(req: Request) {
  return adminWrite(req, async () => {
    // Store the role, not the parent's email, as the requester.
    const result = await generateInsight(adminRepo(), SEEDED_LEARNER_ID, "admin", "admin");
    if (result.status === "capped") return { status: 429, body: { error: "insight_daily_cap" } };
    return { body: { ok: true, source: result.insight?.source ?? null, createdAt: result.insight?.createdAt ?? null } };
  });
}
