import { engineActor, engineFailure, engineJson, readJson } from "@/lib/engine/http";
import { engineRepo } from "@/lib/engine/repos";
import { startSession } from "@/lib/engine/service";

export async function POST(req: Request) {
  const gate = await engineActor(req);
  if (!gate.ok) return gate.response;
  const body = await readJson(req);
  try {
    const result = await startSession(engineRepo(), gate.actor, {
      entryPoint: typeof body.entry === "string" ? body.entry.slice(0, 40) : "study",
      chapterId: typeof body.chapterId === "string" ? body.chapterId : null,
    });
    return engineJson({ session_id: result.sessionId, preview: result.preview, chapter: result.chapter });
  } catch (error) {
    return engineFailure(error);
  }
}
