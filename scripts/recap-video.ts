/**
 * Build narrated slide recap videos (MP4, 1280x720) for religion (col.*) and math chapters.
 *
 *   XAI_API_KEY=... DATABASE_URL=$(cat /tmp/dburl) npx -y tsx scripts/recap-video.ts [--all | chapterId ...] [--frames-only] [--voice=luna] [--rate=0.85]
 *   npx -y tsx --env-file=<file with BLOB_READ_WRITE_TOKEN> scripts/recap-video.ts --upload chapterId ...   (only QA-passed chapters)
 *
 * Narration is Grok voice via lib/tts/server synthesize() (same tts_cache as read-aloud). Output goes to
 * RECAP_VIDEO_DIR (default /workspace/recap-videos/<chapterId>/video.mp4 plus frames and timing.json).
 * --upload puts each video in the PRIVATE Blob store and records it in lib/content/recap-video-media.json,
 * which lib/content/nlm.ts serves through /api/engine/media/<chapterId>/video behind sign-in.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { listChapters } from "@/lib/content/catalog";
import { DEFAULT_GROK_VOICE, isGrokVoiceId, rateToSpeed } from "@/lib/tts/core";
import { synthesize } from "@/lib/tts/server";
import { recapVideoChapterIds, recapVideoPlan, slideNarration } from "@/lib/video/recap-video";
import { slideSvg } from "@/lib/video/slide-svg";

const OUT = process.env.RECAP_VIDEO_DIR ?? "/workspace/recap-videos";
const MANIFEST = path.join(process.cwd(), "lib/content/recap-video-media.json");
const LEAD_IN = 0.4;
const HOLD = { math: 1.3, religion: 2.0 } as const;

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function ff(args: string[]) {
  execFileSync("/usr/bin/ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
}

function probeDuration(file: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
}

async function build(id: string, voice: string, speed: number, framesOnly: boolean) {
  const plan = recapVideoPlan(id);
  if (!plan) throw new Error(`no plan for ${id}`);
  const dir = path.join(OUT, id);
  mkdirSync(dir, { recursive: true });
  const timing: { i: number; start: number; duration: number; narration: string }[] = [];
  const segs: string[] = [];
  let t = 0;
  for (const [i, slide] of plan.slides.entries()) {
    const n = String(i + 1).padStart(2, "0");
    const png = path.join(dir, `frame-${n}.png`);
    await sharp(Buffer.from(slideSvg(slide))).png().toFile(png);
    if (framesOnly) continue;
    const narration = slideNarration(slide);
    const mp3 = path.join(dir, `voice-${n}-${createHash("sha256").update(`${voice}|${speed}|${narration}`).digest("hex").slice(0, 10)}.mp3`);
    if (!existsSync(mp3)) {
      let clip = null;
      for (let attempt = 0; attempt < 3 && !clip; attempt++) {
        clip = await synthesize({ email: "pregenerate@maewoeste.com", text: narration, voice: voice as never, speed, skipDailyCap: true }).catch((e) => {
          console.error(`  tts retry ${id} #${n}: ${e instanceof Error ? e.message : e}`);
          return null;
        });
      }
      if (!clip) throw new Error(`tts failed for ${id} slide ${n}`);
      writeFileSync(mp3, Buffer.from(clip.audioBase64, "base64"));
    }
    const speech = probeDuration(mp3);
    const duration = LEAD_IN + speech + HOLD[plan.subject];
    const seg = path.join(dir, `seg-${n}.mp4`);
    ff([
      "-loop", "1", "-framerate", "30", "-i", png, "-i", mp3,
      "-filter_complex", `[1:a]aresample=44100,adelay=${LEAD_IN * 1000}|${LEAD_IN * 1000},apad[a]`,
      "-map", "0:v", "-map", "[a]", "-t", duration.toFixed(3),
      "-c:v", "libx264", "-preset", "medium", "-tune", "stillimage", "-pix_fmt", "yuv420p", "-r", "30",
      "-c:a", "aac", "-b:a", "128k", "-ac", "1", "-ar", "44100", seg,
    ]);
    const actual = probeDuration(seg);
    timing.push({ i: i + 1, start: Number(t.toFixed(2)), duration: Number(actual.toFixed(2)), narration });
    t += actual;
    segs.push(seg);
  }
  if (framesOnly) return console.log(`frames ${id}: ${plan.slides.length}`);
  const list = path.join(dir, "segments.txt");
  writeFileSync(list, segs.map((s) => `file '${s}'`).join("\n") + "\n");
  const mp4 = path.join(dir, "video.mp4");
  ff(["-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", mp4]);
  writeFileSync(path.join(dir, "timing.json"), JSON.stringify({ id, slides: timing }, null, 2));
  console.log(`video ${id}: ${plan.slides.length} slides, ${probeDuration(mp4).toFixed(1)} s`);
}

async function upload(ids: string[]) {
  const { put } = await import("@vercel/blob");
  const manifest = existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, "utf8")) as Record<string, unknown>) : {};
  for (const id of ids) {
    const file = path.join(OUT, id, "video.mp4");
    const data = readFileSync(file);
    const sha256 = createHash("sha256").update(data).digest("hex");
    const pathname = `recap-video/${id}/video-${sha256.slice(0, 12)}.mp4`;
    const blob = await put(pathname, data, { access: "private", contentType: "video/mp4", multipart: data.length > 8_000_000, allowOverwrite: true, addRandomSuffix: false });
    manifest[id] = { video: { pathname: blob.pathname, contentType: "video/mp4", size: data.length, sha256 } };
    console.log(`up ${id} ${(data.length / 1e6).toFixed(1)} MB -> ${blob.pathname}`);
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })));
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + "\n");
}

async function main() {
  const named = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const ids = process.argv.includes("--all") ? recapVideoChapterIds(listChapters().map((c) => c.id)) : named;
  if (!ids.length) throw new Error("Pass --all or chapter ids.");
  if (process.argv.includes("--upload")) return upload(ids);
  const voice = arg("voice") ?? DEFAULT_GROK_VOICE;
  if (!isGrokVoiceId(voice)) throw new Error(`Unknown voice ${voice}`);
  const speed = rateToSpeed(Number(arg("rate") ?? "0.85"));
  const framesOnly = process.argv.includes("--frames-only");
  if (!framesOnly && !process.env.XAI_API_KEY) throw new Error("Set XAI_API_KEY (and DATABASE_URL to reuse the tts cache).");
  const failed: string[] = [];
  for (const id of ids) {
    await build(id, voice, speed, framesOnly).catch((e) => {
      failed.push(id);
      console.error(`FAIL ${id}: ${e instanceof Error ? e.message : e}`);
    });
  }
  if (failed.length) {
    console.error(`failed: ${failed.join(", ")}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
