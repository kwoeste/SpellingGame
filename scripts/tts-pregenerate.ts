/**
 * Optional: fill the Neon tts_cache with Grok audio for every Study passage so Mae never waits.
 * Costs roughly $0.17 per voice+speed (about 11k characters at $15 / 1M).
 *
 *   XAI_API_KEY=... DATABASE_URL=<neon owner url> npx -y tsx scripts/tts-pregenerate.ts [voice] [rate]
 *   (defaults: luna 0.85; rate is the picker value: 0.7 Slow, 0.85 Normal, 1 Fast)
 */
import { listChapters } from "@/lib/content/catalog";
import { DEFAULT_GROK_VOICE, isGrokVoiceId, normalizeTtsText, rateToSpeed } from "@/lib/tts/core";
import { synthesize } from "@/lib/tts/server";

async function main() {
  const voice = process.argv[2] ?? DEFAULT_GROK_VOICE;
  const rate = Number(process.argv[3] ?? "0.85");
  if (!isGrokVoiceId(voice)) throw new Error(`Unknown voice ${voice}`);
  if (!process.env.XAI_API_KEY || !process.env.DATABASE_URL) throw new Error("Set XAI_API_KEY and DATABASE_URL.");
  const texts = new Set<string>(["Hi! I am your reading voice."]);
  for (const chapter of listChapters()) texts.add(normalizeTtsText(chapter.sentences.map((s) => s.text).join(" ")));
  let fresh = 0;
  let chars = 0;
  for (const text of texts) {
    const clip = await synthesize({ email: "pregenerate@maewoeste.com", text, voice, speed: rateToSpeed(rate), skipDailyCap: true });
    if (!clip.cached) {
      fresh += 1;
      chars += text.length;
    }
  }
  console.log(`Done: ${texts.size} clips (${fresh} new, ${chars} chars billed) for ${voice} @ ${rate}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
