/**
 * Prewarm the Grok read-aloud cache (tts.tts_cache) for every read-aloud string the site sends,
 * so Mae never waits for first-time synthesis. Reuses lib/tts/server synthesize() (same cache key,
 * same format) with skipDailyCap, so the per-user usage counter is never touched. Cached keys are skipped.
 *
 *   XAI_API_KEY=... DATABASE_URL=<neon owner url> npx -y tsx scripts/tts-prewarm.ts [--area=practice,study,...] [--voice=luna] [--rates=0.85,0.7,1] [--dry-run]
 */
import { allSpellingClips } from "@/lib/spelling/list-d2";
import { listChapters } from "@/lib/content/catalog";
import { listRecaps } from "@/lib/content/recaps";
import { bankSize, practiceBank, practiceHelp } from "@/lib/practice/bank";
import { DEFAULT_GROK_VOICE, TTS_MAX_CHARS, isGrokVoiceId, normalizeTtsText, rateToSpeed } from "@/lib/tts/core";
import { synthesize, ttsCacheKey } from "@/lib/tts/server";

type Area = { name: string; texts: () => string[] };

/** Mirrors components/PracticeTest.tsx readable(), the Learn-it CarefulRead join, Show me and the clue panel. */
function practiceTexts(): string[] {
  const out: string[] = ["Yes! Spelled just right."];
  for (const chapterId of ["savvas.ch3"]) {
    const bank = practiceBank(chapterId);
    if (!bank || !bankSize(chapterId)) continue;
    for (const lesson of bank.lessons) out.push(lesson.learn.map((k) => k.explain).join(" "));
    for (const fact of bank.facts) {
      fact.phrasings.forEach((text, p) => {
        out.push(fact.kind === "match" ? `${text} ${(fact.prompts ?? []).join(". ")}.` : text.replace(/___/g, "blank"));
        const help = practiceHelp(`${fact.id}~${p}~b`, 99);
        if (help) {
          out.push(help.hint);
          if (help.reveal) {
            out.push(`${help.reveal.answer}. ${help.reveal.why}`); // PracticeTest showMe
            out.push(`${help.reveal.answer} ${help.reveal.why}`); // StuckHelpPanel "Hear it"
          }
        }
      });
    }
  }
  return out;
}

function studyTexts(): string[] {
  const out = ["Hi! I am your reading voice."];
  for (const chapter of listChapters()) out.push(chapter.sentences.map((s) => s.text).join(" "));
  return out;
}

function watchTexts(): string[] {
  const out: string[] = [];
  for (const recap of listRecaps()) {
    for (const slide of recap.slides) out.push(slide.text);
    out.push(recap.check.prompt);
  }
  return out;
}

export const AREAS: Area[] = [
  { name: "practice", texts: practiceTexts },
  { name: "study", texts: studyTexts },
  { name: "watch", texts: watchTexts },
  { name: "spelling", texts: () => allSpellingClips() },
];

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const dry = process.argv.includes("--dry-run");
  const voice = arg("voice") ?? DEFAULT_GROK_VOICE;
  const rates = (arg("rates") ?? "0.85").split(",").map(Number);
  const wanted = arg("area")?.split(",");
  if (!isGrokVoiceId(voice)) throw new Error(`Unknown voice ${voice}`);
  if (!dry && (!process.env.XAI_API_KEY || !process.env.DATABASE_URL)) throw new Error("Set XAI_API_KEY and DATABASE_URL.");
  const { queryOnce } = await import("@/lib/db/client");
  const seen = new Set<string>();
  for (const area of AREAS.filter((a) => !wanted || wanted.includes(a.name))) {
    const texts = [...new Set(area.texts().map(normalizeTtsText).filter((t) => t && t.length <= TTS_MAX_CHARS))];
    for (const rate of rates) {
      const speed = rateToSpeed(rate);
      const todo = texts.filter((t) => !seen.has(ttsCacheKey(t, voice, speed)));
      todo.forEach((t) => seen.add(ttsCacheKey(t, voice, speed)));
      const keys = todo.map((t) => ttsCacheKey(t, voice, speed));
      const have = new Set(
        process.env.DATABASE_URL
          ? (await queryOnce<{ cache_key: string }>("student", "select cache_key from tts.tts_cache where cache_key = any($1)", [keys])).map((r) => r.cache_key)
          : [],
      );
      const missing = todo.filter((_, i) => !have.has(keys[i]));
      const missingChars = missing.reduce((n, t) => n + t.length, 0);
      if (dry) {
        console.log(`${area.name} @${rate}: ${todo.length} clips, ${missing.length} missing, ${missingChars} chars to generate`);
        continue;
      }
      let fresh = 0, chars = 0, failed = 0;
      for (const text of missing) {
        for (let attempt = 0; ; attempt += 1) {
          try {
            const clip = await synthesize({ email: "prewarm@maewoeste.com", text, voice, speed, skipDailyCap: true });
            if (!clip.cached) { fresh += 1; chars += text.length; }
            break;
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            const retryable = /429|5\d\d|unreachable|bad_payload/.test(msg);
            if (!retryable || attempt >= 4) { failed += 1; console.error(`fail ${msg} :: ${text.slice(0, 50)}`); break; }
            await sleep(2000 * 2 ** attempt);
          }
        }
        await sleep(250);
      }
      console.log(`${area.name} @${rate}: ${fresh} clips / ${chars} chars generated, ${todo.length - missing.length} already cached, ${failed} failed`);
    }
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
