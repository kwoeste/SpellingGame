import { ZONE_HIGH, ZONE_LOW } from "@/lib/admin/types";

/** One plain "so what" line for parents at the top of the dashboard. */
export function parentTakeaway(input: { firstTryAccuracy: number | null; engagedMinutesToday: number; dailyMinutesGoal: number; target?: number }): string {
  const target = input.target ?? 0.8;
  const parts: string[] = [];
  if (input.firstTryAccuracy === null) parts.push("No answers yet today");
  else {
    const p = Math.round(input.firstTryAccuracy * 100);
    const t = Math.round(target * 100);
    if (input.firstTryAccuracy < ZONE_LOW) parts.push(`Right on first try ${p}%, below the ${t}% target: worth going over the missed questions with her`);
    else if (input.firstTryAccuracy < target) parts.push(`Right on first try ${p}%, a little under the ${t}% target`);
    else if (input.firstTryAccuracy > ZONE_HIGH) parts.push(`Right on first try ${p}%: the work may be too easy`);
    else parts.push(`Right on first try ${p}%, on target`);
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
