import { engineActor, engineFailure, engineJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { resumePoint } from "@/lib/engine/service";

export async function GET(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  try {
    return engineJson({ resume: await resumePoint(engineRepo(), gate.actor) });
  } catch (error) {
    return engineFailure(error);
  }
}
