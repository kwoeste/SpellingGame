const WINDOW_MS = 60 * 60 * 1000;
const PER_USER_PER_HOUR = 5;
const recent = new Map<string, number[]>();

/**
 * Per-user sliding window. In-process only, so each serverless instance counts separately;
 * sign-in is the real gate and this just stops a stuck button or a curious kid from flooding.
 */
export function takeReportToken(key: string, now = Date.now()): boolean {
  const hits = (recent.get(key) ?? []).filter((ts) => now - ts < WINDOW_MS);
  if (hits.length >= PER_USER_PER_HOUR) {
    recent.set(key, hits);
    return false;
  }
  hits.push(now);
  recent.set(key, hits);
  return true;
}

export function resetReportLimits(): void {
  recent.clear();
}

/** Plain text for a GitHub issue: no @-mentions, links, images, HTML, or control characters. */
export function sanitizeIssueText(raw: string, max: number): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u2028-\u202e]/g, "")
    .replace(/[<>]/g, "")
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .replace(/[!\[\]()`]/g, "")
    .replace(/@/g, "@\u200b")
    .replace(/#(\d)/g, "# $1")
    .trim()
    .slice(0, max);
}

export function sanitizePagePath(raw: unknown): string {
  if (typeof raw !== "string") return "unknown";
  const path = raw.split(/[?#]/)[0] ?? "";
  return /^\/[a-z0-9/_.-]{0,200}$/i.test(path) ? path : "unknown";
}
