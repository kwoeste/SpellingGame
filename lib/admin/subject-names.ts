/**
 * Client-safe names. This file must not import content (chapter text) because
 * client admin components and lib/admin/types.ts pull it into the browser bundle.
 */

export const SUBJECT_NAMES: Record<string, string> = { math: "Math", science: "Science", ela: "Reading", religion: "Religion" };

/** One consistent subject name everywhere ("ela" reads "Reading"). */
export function subjectName(subject: string | null | undefined): string {
  return (subject && SUBJECT_NAMES[subject]) || "Other";
}

/** Last-resort label for an id with no known name: words only, no dots or underscores. */
export function tidyId(id: string | null | undefined): string {
  if (!id) return "—";
  const words = id.replace(/[._\-:]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "—";
}
