import { z } from "zod";
import { assignmentTitle, catalogChapters, catalogConcept, knownGame } from "@/lib/admin/catalog";
import { suggestedHoleAssignments } from "@/lib/admin/dashboard";
import { loadAssignments, loadSnapshot } from "@/lib/admin/load";
import { adminRead, adminWrite } from "@/lib/auth/admin-api";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { adminRepo } from "@/lib/engine/repos";

const CreateBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("auto_holes") }),
  z.object({
    action: z.literal("assign"),
    targetType: z.enum(["concept", "chapter", "game"]),
    targetId: z.string().min(1).max(80),
    reason: z.string().max(400).optional(),
  }),
  z.object({
    action: z.literal("update"),
    id: z.string().uuid(),
    status: z.enum(["open", "paused", "done", "cancelled"]),
  }),
  z.object({
    action: z.literal("goal"),
    weeklyXpGoal: z.number().int().min(60).max(3000),
    dailyMinutesGoal: z.number().int().min(5).max(180),
  }),
]);

function knownTarget(type: "concept" | "chapter" | "game", id: string): boolean {
  if (type === "concept") return catalogConcept(id) !== null;
  if (type === "chapter") return catalogChapters().some((chapter) => chapter.id === id);
  return knownGame(id);
}

export async function GET(req: Request) {
  return adminRead(req, async () => ({ assignments: await loadAssignments() }));
}

export async function POST(req: Request) {
  return adminWrite(req, async (actor) => {
    const parsed = CreateBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return { status: 400, body: { error: "invalid_assignment" } };
    const repo = adminRepo();
    const body = parsed.data;
    switch (body.action) {
      case "auto_holes": {
        const snap = await loadSnapshot();
        const created = [];
        for (const row of suggestedHoleAssignments(snap, actor.email)) {
          created.push(await repo.createAssignment(row));
        }
        return { body: { created, assignments: await loadAssignments() } };
      }
      case "assign": {
        if (!knownTarget(body.targetType, body.targetId)) {
          return { status: 400, body: { error: "unknown_target" } };
        }
        const created = await repo.createAssignment({
          learnerId: SEEDED_LEARNER_ID,
          kind: "manual",
          targetType: body.targetType,
          targetId: body.targetId,
          title: assignmentTitle(body.targetType, body.targetId),
          reason: body.reason ?? null,
          status: "open",
          createdBy: actor.email,
        });
        return { body: { created, assignments: await loadAssignments() } };
      }
      case "update": {
        const updated = await repo.updateAssignment(body.id, {
          status: body.status,
          completedAt: body.status === "done" || body.status === "cancelled" ? Date.now() : null,
        });
        if (!updated) return { status: 404, body: { error: "not_found" } };
        return { body: { updated, assignments: await loadAssignments() } };
      }
      case "goal": {
        await repo.upsertGoal({
          learnerId: SEEDED_LEARNER_ID,
          weeklyXpGoal: body.weeklyXpGoal,
          dailyMinutesGoal: body.dailyMinutesGoal,
          updatedAt: Date.now(),
          updatedBy: actor.email,
        });
        return { body: { assignments: await loadAssignments() } };
      }
      default: {
        const unhandled: never = body;
        throw new Error(`Unhandled assignment action: ${String(unhandled)}`);
      }
    }
  });
}
