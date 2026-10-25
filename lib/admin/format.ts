const ET = "America/New_York";

export function formatEtDateTime(ts: number): string {
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts))} ET`;
}

export function formatEtDate(ts: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ET,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ts));
}

export function formatEtWeekday(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(ts));
}

export function etTodayKey(now = Date.now()): string {
  return formatEtDate(now);
}

export function etWeekStartKey(now = Date.now()): string {
  const today = formatEtDate(now);
  const [y, m, d] = today.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12));
  const daysSinceMonday = (noonUtc.getUTCDay() + 6) % 7;
  noonUtc.setUTCDate(noonUtc.getUTCDate() - daysSinceMonday);
  return noonUtc.toISOString().slice(0, 10);
}

export function streakDays(dayKeys: Set<string>, now = Date.now()): number {
  const cursor = new Date(`${formatEtDate(now)}T12:00:00Z`);
  if (!dayKeys.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

export function ringPct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((done / total) * 100) / 5) * 5));
}

export function formatPct(value: number | null, digits = 0): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatAnswer(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((part) => formatAnswer(part)).join(", ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("choice" in record) return formatAnswer(record.choice);
    if ("value" in record) return formatAnswer(record.value);
    return Object.entries(record)
      .map(([key, val]) => `${key} → ${formatAnswer(val)}`)
      .join("; ");
  }
  return String(value);
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export type RingProgress = {
  /** True percent, not capped (44 of 15 is 293). */
  pct: number;
  /** 0-100, how much of the circle to fill. */
  arcPct: number;
  met: boolean;
  /** Text inside the ring: "73%", "Goal met", or "—" when there is no goal. */
  label: string;
};

/** Ring math: exact rounding (no 5% steps), capped arc, and "Goal met" once done reaches the goal. */
export function ringProgress(done: number, goal: number): RingProgress {
  if (!Number.isFinite(goal) || goal <= 0) return { pct: 0, arcPct: 0, met: false, label: "—" };
  const safeDone = Math.max(0, Number.isFinite(done) ? done : 0);
  const exact = Math.round((safeDone / goal) * 100);
  const met = safeDone >= goal;
  return { pct: exact, arcPct: Math.min(100, exact), met, label: met ? "Goal met" : `${exact}%` };
}

/** Friendly ET day for a YYYY-MM-DD key: "Mon, Oct 19". */
export function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  if (!y || !m || !d) return dayKey;
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d, 12)),
  );
}

/** Clock time in ET: "9:55 AM". */
export function formatEtTime(ts: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: ET, hour: "numeric", minute: "2-digit" }).format(new Date(ts));
}

/** "Oct 25, 8:54 – 9:55 AM ET" (same day) for a session span. */
/** "Sun, Oct 25" in ET. */
export function formatEtDay(ts: number): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: ET, weekday: "short", month: "short", day: "numeric" }).format(new Date(ts));
}

export function formatEtSpan(start: number, end: number | null): string {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: ET, month: "short", day: "numeric" }).format(new Date(start));
  if (end === null || end <= start) return `${day}, ${formatEtTime(start)} ET`;
  return `${day}, ${formatEtTime(start)} – ${formatEtTime(end)} ET`;
}
