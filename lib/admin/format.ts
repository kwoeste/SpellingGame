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
