/** Plain-English names for strategy labels. Raw ids (inferred_rules, skim_suspected…) never reach the page. */
const LABELS: Record<string, { label: string; detail: string }> = {
  guess: { label: "Quick guess", detail: "Answered very fast and missed — likely a guess." },
  skim_suspected: { label: "Read too fast", detail: "Answered faster than she could have read the question." },
  evidence_guess: { label: "Picked without proof", detail: "Chose an answer without finding the sentence that proves it." },
  wrong_proof: { label: "Right answer, wrong proof", detail: "Picked the right answer but tapped a sentence that doesn't prove it." },
  evidence_lookback: { label: "Looked back for proof", detail: "Went back to the reading to find the answer." },
  order_mixup: { label: "Mixed up the order", detail: "Had the events but put some out of order." },
  meaning_mixup: { label: "Mixed up word meanings", detail: "Swapped the meanings of some words." },
  hint_supported: { label: "Needed hints", detail: "Missed even after a hint." },
  known_fact_or_mental: { label: "Knew it", detail: "Fast and right without help." },
  counting_on_ones: { label: "Counted by ones", detail: "Counted up one at a time." },
  decomposition_tens: { label: "Split into tens", detail: "Broke numbers into tens and ones." },
  partial_products_area_model: { label: "Area model", detail: "Split the multiplication into parts." },
  partial_quotients: { label: "Partial quotients", detail: "Divided in chunks." },
};

export const NOT_ENOUGH_DATA = "Not enough data yet";

export function isUnknownStrategy(value: string | null | undefined): boolean {
  return !value || value === "unknown";
}

export function strategyLabel(value: string | null | undefined): string {
  if (isUnknownStrategy(value)) return NOT_ENOUGH_DATA;
  const known = LABELS[value as string];
  if (known) return known.label;
  // Admin-typed labels: tidy underscores, keep their words.
  const words = (value as string).replace(/[_\.]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function strategyDetail(value: string | null | undefined): string {
  if (isUnknownStrategy(value)) return "Not enough answers on this kind of question to tell how she worked it out.";
  return LABELS[value as string]?.detail ?? "Labeled by a parent.";
}

export function strategySourceLabel(source: string | null | undefined): string {
  if (source === "admin_label") return "Set by you";
  if (source === "self_report") return "Mae said";
  if (source === "constrained_tool") return "From her work";
  return "Best guess";
}

/** Choices offered when a parent relabels a row. */
export const RELABEL_CHOICES = Object.entries(LABELS).map(([id, v]) => ({ id, label: v.label }));

const MATH_ONLY = new Set(["known_fact_or_mental", "counting_on_ones", "decomposition_tens", "partial_products_area_model", "partial_quotients"]);
const READING_ONLY = new Set(["skim_suspected", "evidence_guess", "wrong_proof", "evidence_lookback", "order_mixup", "meaning_mixup"]);

/** Relabel choices that make sense for a subject: no math methods on a Religion question, no reading-proof reasons on math. */
export function relabelChoicesFor(subject: string | null | undefined): { id: string; label: string }[] {
  if (subject === "math") return RELABEL_CHOICES.filter((c) => !READING_ONLY.has(c.id));
  return RELABEL_CHOICES.filter((c) => !MATH_ONLY.has(c.id));
}
