/**
 * Narrated slide-style recap videos (replacing NotebookLM videos for religion and math).
 * Pure planning + SVG drawing; scripts/recap-video.ts adds Grok voice and encodes the MP4.
 * Every word on a slide is spoken (titles included), so Mae can read along word for word.
 * Pictures are drawn in code: math visuals are exact (2 × 4 is 2 rows of 4); religion uses
 * stained-glass-style symbols (cross, dove, candle, church...). No people are ever drawn.
 */
import { getChapter } from "@/lib/content/catalog";
import { COL_RECAPS } from "@/lib/content/recaps-col";
import { MATH_SEEDS, visualValue, type MathVisual } from "@/lib/content/recaps-math";

export type SymbolName =
  | "cross" | "dove" | "candle" | "church" | "bible" | "tablets" | "star" | "heart" | "chalice"
  | "keys" | "lily" | "sunrise" | "mountain" | "path" | "bread" | "house" | "sheep" | "gift" | "bell" | "crown";

export type VideoVisual = MathVisual | { kind: "strip"; step: number } | { kind: "symbol"; name: SymbolName };
export type VideoSlide = { title?: string; lines: string[]; visual: VideoVisual };
export type VideoPlan = { chapterId: string; subject: "math" | "religion"; slides: VideoSlide[] };

/** Chapters that already have a passing NotebookLM video and so are not regenerated. */
export const KEEP_NLM_VIDEO = new Set(["col.ch1", "col.ch2", "col.ch3"]);

/** On-screen text of a slide, in reading order. */
export function slideScreenText(slide: VideoSlide): string {
  return [slide.title, ...slide.lines].filter(Boolean).map((s) => ensureStop(s!)).join(" ");
}

function ensureStop(s: string): string {
  return /[.!?:]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`;
}

/** What the voice says: exactly the screen words, with math symbols read as words. */
export function speakable(text: string): string {
  return text
    .replace(/(\d)\s*×\s*(\d)/g, "$1 times $2")
    .replace(/×/g, "times")
    .replace(/\s*=\s*/g, " equals ")
    .replace(/(\d)\s*\+\s*(\d)/g, "$1 plus $2")
    .replace(/(\d)\s+-\s+(\d)/g, "$1 minus $2")
    .replace(/\s+/g, " ")
    .trim();
}

export function slideNarration(slide: VideoSlide): string {
  return speakable(slideScreenText(slide));
}

const SYMBOL_RULES: [RegExp, SymbolName][] = [
  [/commandment|moses|covenant|tablet/i, "tablets"],
  [/holy spirit|dove|peacemaker|\bpeace\b/i, "dove"],
  [/peter|\brock\b|keys/i, "keys"],
  [/angelus|\bbell/i, "bell"],
  [/mary|angel/i, "lily"],
  [/scripture|bible|gospel|testament|wrote|\bread\b|word of god|god's word/i, "bible"],
  [/bethlehem|incarnation|\bstar\b|son came/i, "star"],
  [/\bmass\b|sacrifice|eucharist|offered|perfect gift/i, "chalice"],
  [/beatitude|mountain|sermon/i, "mountain"],
  [/rose|new life|hope|heaven|forever|happiness/i, "sunrise"],
  [/\bpath\b|walk|step/i, "path"],
  [/feed|hungry|bread|share|sharing|generous/i, "bread"],
  [/flock|sheep|shepherd/i, "sheep"],
  [/talent|gifts\b|\bgift\b/i, "gift"],
  [/family|parent|honor (your|our) (father|mother)|home/i, "house"],
  [/church|sunday|lord's day|worship|adore/i, "church"],
  [/pray|prayer|faith|conscience|truth|still|listen|light/i, "candle"],
  [/love|compassion|kind|forgive|sorry|merciful|neighbor|heart|body|bodies/i, "heart"],
  [/\bname\b|king|glory/i, "crown"],
  [/cross|died|jesus/i, "cross"],
];

export function symbolFor(text: string): SymbolName {
  for (const [re, name] of SYMBOL_RULES) if (re.test(text)) return name;
  return "cross";
}

function sentences(paragraph: string): string[] {
  return paragraph.match(/[^.!?]+[.!?]+["')]?/g)?.map((s) => s.trim()) ?? [paragraph];
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function firstFact(text: string): MathVisual | null {
  const m = text.match(/(\d+)\s*×\s*(\d+)/);
  if (!m) return null;
  const rows = Number(m[1]);
  const cols = Number(m[2]);
  return rows >= 1 && rows <= 10 && cols >= 1 && cols <= 10 ? { kind: "array", rows, cols } : null;
}

const VISUAL_TITLE: Record<MathVisual["kind"], string> = {
  groups: "Equal groups",
  array: "An array",
  split: "Break it apart",
  rods: "Bars of ten",
  hops: "Skip-count",
};

export function mathFactor(chapterId: string): number | null {
  const m = chapterId.match(/^math\.mult\.(\d+)s$/);
  return m ? Number(m[1]) : null;
}

function mathPlan(chapterId: string): VideoPlan | null {
  const chapter = getChapter(chapterId);
  const seed = MATH_SEEDS[chapterId];
  const n = mathFactor(chapterId);
  if (!chapter || !seed || !n) return null;
  const strip: VideoVisual = { kind: "strip", step: n };
  const slides: VideoSlide[] = [{ title: chapter.titleKid, lines: [chapter.bigQuestion], visual: strip }];
  if (chapter.storyHook) slides.push({ title: "Think about it", lines: [chapter.storyHook], visual: strip });
  for (const s of chapter.sentences) slides.push({ title: "Learn it", lines: [s.text], visual: firstFact(s.text) ?? strip });
  for (const s of seed.slides) slides.push({ title: VISUAL_TITLE[s.visual.kind], lines: [s.text], visual: s.visual });
  for (let b = 1; b <= 10; b++) {
    slides.push({ title: `${n} × ${b} = ${n * b}`, lines: [`${n} ${n === 1 ? "row" : "rows"} of ${b} make ${n * b}.`], visual: { kind: "array", rows: n, cols: b } });
  }
  slides.push({ title: `Skip-count by ${n}s`, lines: [Array.from({ length: 10 }, (_, i) => n * (i + 1)).join(", ") + "."], visual: strip });
  for (const pair of chunk(chapter.vocab, 2)) {
    slides.push({ title: "Words to know", lines: pair.map((v) => `${cap(v.word)} means ${v.definition}.`), visual: strip });
  }
  slides.push({ title: "Great job!", lines: [`Practice your ${n}s facts every day.`, "You can do it!"], visual: { kind: "array", rows: n, cols: n } });
  return { chapterId, subject: "math", slides };
}

function religionPlan(chapterId: string): VideoPlan | null {
  const chapter = getChapter(chapterId);
  const recap = COL_RECAPS[chapterId];
  if (!chapter || !recap) return null;
  const all = `${chapter.titleKid} ${chapter.sentences.map((s) => s.text).join(" ")}`;
  const slides: VideoSlide[] = [{ title: `Chapter ${chapter.number}: ${chapter.titleKid}`, lines: [chapter.bigQuestion], visual: { kind: "symbol", name: symbolFor(all) } }];
  for (const [, text] of recap.slides) slides.push({ lines: [text], visual: { kind: "symbol", name: symbolFor(text) } });
  const read = chunk(chapter.sentences.flatMap((s) => sentences(s.text)), 2);
  read.forEach((group, i) => slides.push({ title: i === 0 ? "Let's read" : undefined, lines: group, visual: { kind: "symbol", name: symbolFor(group.join(" ")) } }));
  for (const v of chapter.vocab) slides.push({ title: "Words to know", lines: [`${cap(v.word)} means ${v.definition}.`], visual: { kind: "symbol", name: symbolFor(`${v.word} ${v.definition}`) } });
  if (chapter.sequence.length) {
    const words = ["First", "Next", "Then", "After that", "Last"];
    const ordered = [...chapter.sequence].sort((x, y) => x.order - y.order).map((c) => c.label);
    const seq = ordered.map((step, i) => `${i === ordered.length - 1 ? "Last" : words[Math.min(i, 3)]}: ${step}.`);
    slides.push({ title: "In order", lines: seq, visual: { kind: "symbol", name: symbolFor(ordered.join(" ")) } });
  }
  for (const item of chapter.items) {
    if (typeof item.answer !== "string" || !item.stem || !/^(tap_evidence|mc)$/.test(item.type)) continue;
    slides.push({ title: "Quick check", lines: [item.stem, "Think of your answer."], visual: { kind: "symbol", name: symbolFor(item.stem) } });
    slides.push({ title: "The answer", lines: [ensureStop(item.answer)], visual: { kind: "symbol", name: symbolFor(`${item.stem} ${item.answer}`) } });
  }
  slides.push({ title: "Let's remember", lines: recap.slides.slice(0, 3).map(([, text]) => text), visual: { kind: "symbol", name: symbolFor(recap.slides.slice(0, 3).map(([, x]) => x).join(" ")) } });
  const t = recap.tryAtHome;
  slides.push({ title: `Try at home: ${t.title}`, lines: [`You need: ${t.materials.join(", ")}.`], visual: { kind: "symbol", name: "house" } });
  for (const steps of chunk(t.steps, 2)) slides.push({ lines: steps, visual: { kind: "symbol", name: symbolFor(steps.join(" ")) } });
  slides.push({ title: "Think about it", lines: [chapter.bigQuestion, "Talk about it with your family."], visual: { kind: "symbol", name: "candle" } });
  return { chapterId, subject: "religion", slides };
}

export function recapVideoPlan(chapterId: string): VideoPlan | null {
  if (chapterId.startsWith("math.")) return mathPlan(chapterId);
  if (chapterId.startsWith("col.")) return religionPlan(chapterId);
  return null;
}

/** Chapters this generator covers: every math chapter and every col.* chapter without a kept NLM video. */
export function recapVideoChapterIds(ids: string[]): string[] {
  return ids.filter((id) => (id.startsWith("math.mult.") || id.startsWith("col.")) && !KEEP_NLM_VIDEO.has(id) && recapVideoPlan(id) !== null);
}

export { visualValue };
