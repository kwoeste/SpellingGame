import { beforeEach, describe, expect, it, vi } from "vitest";

const blob = vi.hoisted(() => ({
  issueSignedToken: vi.fn(),
  presignUrl: vi.fn(),
  get: vi.fn(),
}));
vi.mock("@vercel/blob", () => blob);
vi.mock("@/lib/auth/guards", () => ({
  requireRole: vi.fn(async () => ({ ok: true, actor: { role: "student" } })),
  jsonUnauthorized: () => new Response(null, { status: 401 }),
  jsonForbidden: () => new Response(null, { status: 403 }),
}));

import { GET } from "@/app/api/engine/media/[chapterId]/[kind]/route";
import { proxiedMedia } from "@/lib/content/media-url";
import manifest from "@/lib/content/nlm-media.json";

const call = (chapterId: string, kind: string, range?: string) =>
  GET(new Request(`http://local/api/engine/media/${chapterId}/${kind}`, { headers: range ? { range } : {} }), {
    params: Promise.resolve({ chapterId, kind }),
  });

describe("media streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    blob.issueSignedToken.mockResolvedValue({ clientSigningToken: "c", delegationToken: "d" });
    blob.presignUrl.mockImplementation(async (_t, o: { pathname: string }) => ({ presignedUrl: `https://store.private.blob.vercel-storage.com/${o.pathname}?sig=x` }));
  });

  it("redirects every chapter's audio and video to a short-lived signed, read-only link", async () => {
    const entries = Object.entries(manifest as Record<string, Record<string, { pathname: string }>>);
    expect(entries.length).toBeGreaterThan(2);
    for (const [chapterId, media] of entries) {
      for (const [kind, entry] of Object.entries(media)) {
        const res = await call(chapterId, kind, "bytes=0-");
        expect(res.status, `${chapterId}/${kind}`).toBe(302);
        expect(res.headers.get("location")).toContain(entry.pathname);
        expect(res.headers.get("cache-control")).toContain("no-store");
      }
    }
    const opts = blob.issueSignedToken.mock.calls[0][0];
    expect(opts.operations).toEqual(["get"]);
    expect(opts.validUntil - Date.now()).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });

  it("falls back to a proxy that returns 206 with Content-Range for partial reads", async () => {
    const res = proxiedMedia(new ReadableStream(), new Headers({ "content-range": "bytes 0-99/3020147", "content-length": "100" }), "audio/mp4");
    expect(res.status).toBe(206);
    expect(res.headers.get("content-type")).toBe("audio/mp4");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-range")).toBe("bytes 0-99/3020147");
  });

  it("audio entries are audio/mp4", () => {
    for (const media of Object.values(manifest as Record<string, Record<string, { contentType: string }>>)) {
      if (media.audio) expect(media.audio.contentType).toBe("audio/mp4");
    }
  });
});
