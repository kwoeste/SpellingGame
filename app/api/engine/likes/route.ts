import { engineActor, engineFailure, engineJson, readJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { getLikes, saveLikes } from "@/lib/engine/service";

export async function GET(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  try {
    return engineJson({ likes: await getLikes(engineRepo(), gate.actor) });
  } catch (error) {
    return engineFailure(error);
  }
}

export async function POST(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  const body = await readJson(req);
  try {
    return engineJson({ likes: await saveLikes(engineRepo(), gate.actor, body.tags) });
  } catch (error) {
    return engineFailure(error);
  }
}
