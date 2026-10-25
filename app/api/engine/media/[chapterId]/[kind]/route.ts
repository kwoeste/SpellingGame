import { get } from "@vercel/blob";
import { jsonForbidden, jsonUnauthorized, requireRole } from "@/lib/auth/guards";
import { getChapter } from "@/lib/content/catalog";
import { isMediaKind, mediaEntry } from "@/lib/content/nlm";
import { chapterVisibleTo } from "@/lib/content/student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Streams a chapter's NotebookLM video/audio from the private Blob store to signed-in
 * student/admin users only. Forwards Range so the video can seek.
 */
export async function GET(req: Request, { params }: { params: Promise<{ chapterId: string; kind: string }> }) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  const { chapterId, kind } = await params;
  const chapter = getChapter(chapterId);
  if (!chapter || !chapterVisibleTo(chapter, gate.actor.role) || !isMediaKind(kind)) return new Response("Not found", { status: 404 });
  const entry = mediaEntry(chapterId, kind);
  if (!entry) return new Response("Not found", { status: 404 });

  const range = req.headers.get("range");
  const blob = await get(entry.pathname, { access: "private", headers: range ? { range } : undefined }).catch(() => null);
  if (!blob || blob.statusCode !== 200 || !blob.stream) return new Response("Not found", { status: 404 });

  const headers = new Headers({
    "Content-Type": entry.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const contentRange = blob.headers.get("content-range");
  const length = blob.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  if (contentRange) headers.set("Content-Range", contentRange);
  return new Response(blob.stream, { status: contentRange ? 206 : 200, headers });
}
