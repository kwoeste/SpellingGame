import { get } from "@vercel/blob";
import { jsonForbidden, jsonUnauthorized, requireRole } from "@/lib/auth/guards";
import { getChapter } from "@/lib/content/catalog";
import { isMediaKind, mediaEntry } from "@/lib/content/nlm";
import { proxiedMedia, signedMediaUrl } from "@/lib/content/media-url";
import { chapterVisibleTo } from "@/lib/content/student";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Gives signed-in student/admin users a chapter's NotebookLM video/audio from the private
 * Blob store. Normally redirects (302) to a short-lived signed Blob link so the CDN serves
 * byte ranges directly; piping a 30 MB file through this function stalled video and left
 * audio at 0:00. Falls back to proxying with proper 206/Content-Range handling.
 */
export async function GET(req: Request, { params }: { params: Promise<{ chapterId: string; kind: string }> }) {
  const gate = await requireRole(req, ["student", "admin"]);
  if (!gate.ok) return gate.status === 401 ? jsonUnauthorized() : jsonForbidden();
  const { chapterId, kind } = await params;
  const chapter = getChapter(chapterId);
  if (!chapter || !chapterVisibleTo(chapter, gate.actor.role) || !isMediaKind(kind)) return new Response("Not found", { status: 404 });
  const entry = mediaEntry(chapterId, kind);
  if (!entry) return new Response("Not found", { status: 404 });

  const signed = await signedMediaUrl(entry.pathname).catch(() => null);
  if (signed) {
    return new Response(null, {
      status: 302,
      headers: { Location: signed, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
    });
  }

  const range = req.headers.get("range");
  const blob = await get(entry.pathname, { access: "private", headers: range ? { range } : undefined }).catch(() => null);
  if (!blob || !blob.stream) return new Response("Not found", { status: 404 });
  return proxiedMedia(blob.stream, blob.headers, entry.contentType);
}

