/**
 * Optional: fill the Neon tts_cache with Grok audio for every Study passage and Watch it slide so Mae never waits.
 * Costs roughly $0.17 per voice+speed (about 11k characters at $15 / 1M).
 *
 *   XAI_API_KEY=... DATABASE_URL=<neon owner url> npx -y tsx scripts/tts-pregenerate.ts [voice] [rate]
 *   (defaults: luna 0.85; rate is the picker value: 0.7 Slow, 0.85 Normal, 1 Fast)
 */
import { listChapters } from "@/lib/content/catalog";
import { listRecaps } from "@/lib/content/recaps";
import { DEFAULT_GROK_VOICE, isGrokVoiceId, normalizeTtsText, rateToSpeed } from "@/lib/tts/core";
import { synthesize } from "@/lib/tts/server";

async function main() {
  const voice = process.argv[2] ?? DEFAULT_GROK_VOICE;
  const rate = Number(process.argv[3] ?? "0.85");
  if (!isGrokVoiceId(voice)) throw new Error(`Unknown voice ${voice}`);
  if (!process.argv.includes("--dry-run") && (!process.env.XAI_API_KEY || !process.env.DATABASE_URL)) throw new Error("Set XAI_API_KEY and DATABASE_URL.");
  const texts = new Set<string>(["Hi! I am your reading voice."]);
  for (const chapter of listChapters()) texts.add(normalizeTtsText(chapter.sentences.map((s) => s.text).join(" ")));
  if (!process.argv.includes("--passages-only")) {
    for (const recap of listRecaps()) {
      for (const slide of recap.slides) texts.add(normalizeTtsText(slide.text));
      texts.add(normalizeTtsText(recap.check.prompt));
    }
  }
  if (process.argv.includes("--dry-run")) {
    console.log(`Dry run: ${texts.size} clips, ${[...texts].reduce((n, t) => n + t.length, 0)} chars max.`);
    return;
  }
  let fresh = 0;
  let failed = 0;
  let chars = 0;
  for (const text of texts) {
    const clip = await synthesize({ email: "pregenerate@maewoeste.com", text, voice, speed: rateToSpeed(rate), skipDailyCap: true }).catch((error) => {
      failed += 1;
      console.error(`skip (${text.length} chars): ${error instanceof Error ? error.message : error} :: ${text.slice(0, 40)}`);
      return null;
    });
    if (!clip) continue;
    if (!clip.cached) {
      fresh += 1;
      chars += text.length;
    }
  }
  console.log(`Done: ${texts.size} clips (${fresh} new, ${chars} chars billed) for ${voice} @ ${rate}; ${failed} failed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
