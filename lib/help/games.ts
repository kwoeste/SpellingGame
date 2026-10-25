import { helpStage, letterHint, slowSpelling, type StuckHelp } from "@/lib/help/ladder";

/** Sort-into-bins games (NamedGame): the hint places up to two wrong cards; Show me places them all. */
export function binGameHelp(
  items: readonly { label: string; bin: string }[],
  placed: Record<string, string>,
  misses: number,
): (StuckHelp & { place?: Record<string, string> }) | null {
  const stage = helpStage(misses);
  if (stage === "none") return null;
  const wrong = items.filter((item) => placed[item.label] !== item.bin);
  const give = wrong.slice(0, 2);
  const place = Object.fromEntries(give.map((item) => [item.label, item.bin]));
  const hint = give.length
    ? `${give.map((item) => `"${item.label}" goes in "${item.bin}".`).join(" ")} I moved ${give.length === 1 ? "it" : "them"} for you.`
    : "Look at each card one more time.";
  if (stage === "hint") return { stage, hint, place };
  const all = Object.fromEntries(items.map((item) => [item.label, item.bin]));
  return {
    stage,
    hint,
    place,
    reveal: {
      answer: "Here is where every card goes.",
      why: items.map((item) => `${item.label} → ${item.bin}`).join("; "),
      response: all,
    },
  };
}

/** Spelling: the hint shows half the letters and reads the word slowly; Show me shows the whole word. */
export function spellingHelp(word: string, misses: number): (StuckHelp & { speak: string }) | null {
  const stage = helpStage(misses);
  if (stage === "none") return null;
  const hint = `It starts like this: ${letterHint(word)}. Listen to it slowly.`;
  const speak = slowSpelling(word);
  if (stage === "hint") return { stage, hint, speak };
  return {
    stage,
    hint,
    speak,
    reveal: { answer: `The word is "${word}": ${[...word].join(" ")}`, why: "Say each letter as you tap it.", response: word },
  };
}
