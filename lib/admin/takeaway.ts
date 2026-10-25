import { ZONE_HIGH, ZONE_LOW } from "@/lib/admin/types";

/** One plain "so what" line for parents at the top of the dashboard. */
/** Uses the same healthy range (ZONE_LOW–ZONE_HIGH) as the first-try card and chart. */
export function parentTakeaway(input: { firstTryAccuracy: number | null; engagedMinutesToday: number; dailyMinutesGoal: number }): string {
  const parts: string[] = [];
  if (input.firstTryAccuracy === null) parts.push("No answers yet today");
  else {
    const p = Math.round(input.firstTryAccuracy * 100);
    const range = `${Math.round(ZONE_LOW * 100)}–${Math.round(ZONE_HIGH * 100)}%`;
    if (input.firstTryAccuracy < ZONE_LOW) parts.push(`Right on first try ${p}%, below the healthy ${range} range: worth going over the missed questions with her`);
    else if (input.firstTryAccuracy > ZONE_HIGH) parts.push(`Right on first try ${p}%, above the healthy ${range} range: the work may be too easy`);
    else parts.push(`Right on first try ${p}%, in the healthy ${range} range`);
  }
  if (input.dailyMinutesGoal > 0) {
    parts.push(
      input.engagedMinutesToday >= input.dailyMinutesGoal
        ? `daily ${input.dailyMinutesGoal}-minute goal met (${input.engagedMinutesToday} min)`
        : `${input.engagedMinutesToday} of ${input.dailyMinutesGoal} minutes today`,
    );
  }
  return `${parts.join("; ")}.`;
}
