/**
 * Grok session planner. Sends only de-identified facts (candidate ids, catalog titles, concept
 * ids, mastery numbers, due counts, accuracy and rush rates) and asks for an ordering of the
 * candidates plus two short lines. Never sends a name, email, or anything she typed.
 */
export const PLANNER_MODEL = process.env.XAI_PLANNER_MODEL || "grok-4.20-0309-non-reasoning";
export const PLANNER_TIMEOUT_MS = 4000;

export type PlannerCandidate = {
  id: string;
  kind: string;
  title: string;
  locked: boolean;
  minutes: number;
  concept_ids: string[];
  mastery: number | null;
  due_reviews: number;
};

export type PlannerFacts = {
  minutes_goal: number;
  minutes_today: number;
  recent_accuracy: number | null;
  recent_answers: number;
  rush_rate: number;
  candidates: PlannerCandidate[];
};

export type AiPlanResult = { order: string[]; why_kid: string; admin_note: string };

const SYSTEM = [
  "You plan a short daily study session for a 9-year-old student, Alpha School style:",
  "mastery first, spaced review, about the daily minutes goal, then free time.",
  "Order ONLY the unlocked candidate ids you are given (locked ones are already first).",
  "Return every unlocked id exactly once. Do not invent ids.",
  "why_kid: one cheerful sentence for the student, max 100 characters, no names.",
  "admin_note: one plain sentence for the parent explaining the ordering, max 180 characters.",
].join(" ");

export const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    order: { type: "array", items: { type: "string" } },
    why_kid: { type: "string" },
    admin_note: { type: "string" },
  },
  required: ["order", "why_kid", "admin_note"],
} as const;

/** The exact messages sent to xAI (exported so tests can prove there is no PII). */
export function plannerMessages(facts: PlannerFacts) {
  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: JSON.stringify(facts) },
  ];
}

type Fetch = typeof fetch;

export async function aiOrderPlan(facts: PlannerFacts, doFetch: Fetch = fetch, key = process.env.XAI_API_KEY): Promise<AiPlanResult | null> {
  if (!key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PLANNER_TIMEOUT_MS);
  try {
    const response = await doFetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: PLANNER_MODEL,
        messages: plannerMessages(facts),
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_schema", json_schema: { name: "today_plan", strict: true, schema: PLAN_SCHEMA } },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    const parsed = JSON.parse(content) as AiPlanResult;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
