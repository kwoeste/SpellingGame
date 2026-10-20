export type SpellingProgress = { index: number; round: number };

export function storageKey(listId: string): string {
  return `spelling-safari:${listId}`;
}

export function loadProgress(listId: string): SpellingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(storageKey(listId));
    if (!stored) return null;
    const parsed = JSON.parse(stored) as SpellingProgress;
    if (typeof parsed.index === "number" && typeof parsed.round === "number") {
      return parsed;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function saveProgress(listId: string, index: number, round: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(listId), JSON.stringify({ index, round }));
  } catch {
    // Ignore storage errors
  }
}

export function clearProgress(listId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(listId));
  } catch {
    // Ignore storage errors
  }
}
