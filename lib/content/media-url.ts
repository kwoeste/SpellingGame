import { issueSignedToken, presignUrl } from "@vercel/blob";

/** How long a signed media link stays valid. Long enough for a full video with pauses. */
export const MEDIA_LINK_MS = 2 * 60 * 60 * 1000;

/**
 * Short-lived signed link to one private Blob object, readable only (get). The Blob CDN
 * serves it with byte-range support and the stored Content-Type, so audio and video
 * stream and seek natively instead of being piped through a serverless function.
 */
export async function signedMediaUrl(pathname: string, now = Date.now()): Promise<string> {
  const validUntil = now + MEDIA_LINK_MS;
  const token = await issueSignedToken({ pathname, operations: ["get"], validUntil });
  const { presignedUrl } = await presignUrl(token, { operation: "get", pathname, access: "private", validUntil });
  return presignedUrl;
}

/** Copies the upstream range headers so the browser gets a real 206 for partial reads. */
export function proxiedMedia(stream: ReadableStream<Uint8Array>, upstream: { get(name: string): string | null }, contentType: string): Response {
  const headers = new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const contentRange = upstream.get("content-range");
  const length = upstream.get("content-length");
  if (length) headers.set("Content-Length", length);
  if (contentRange) headers.set("Content-Range", contentRange);
  return new Response(stream, { status: contentRange ? 206 : 200, headers });
}
