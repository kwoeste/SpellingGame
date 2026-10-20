import { z } from "zod";
import { adminWrite } from "@/lib/auth/admin-api";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { adminRepo } from "@/lib/engine/repos";

const Body = z.object({
  eventId: z.string().uuid(),
  strategy: z.string().min(1).max(60),
});

export async function POST(req: Request) {
  return adminWrite(req, async (actor) => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return { status: 400, body: { error: "invalid_relabel" } };
    await adminRepo().relabelStrategy(parsed.data.eventId, SEEDED_LEARNER_ID, parsed.data.strategy, actor.email);
    return { body: { ok: true } };
  });
}
