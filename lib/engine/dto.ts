import {
  FEEDBACK_FORBIDDEN_KEYS,
  NEXT_ITEM_FORBIDDEN_KEYS,
  STUDENT_PROGRESS_ALLOWLIST,
  assertNoForbiddenKeys,
  pickAllowlisted,
} from "@/lib/auth/guards";

export type Ring = {
  id: string;
  label: string;
  pct: number;
  review_done_today?: boolean;
};

export type StudentProgressDTO = {
  rings: Ring[];
  xp_total: number;
  xp_today: number;
  streak_days: number;
  badges: string[];
};

export type NextItemDTO = {
  item_id: string;
  activity_id: string;
  type: string;
  prompt: string;
  options?: string[];
  sentences?: { id: string; text: string }[];
  scaffold_level: number;
  theme: string | null;
  read_aloud_text?: string;
};

export type FeedbackDTO = {
  correct: boolean;
  explanation: string;
  proving_sentence?: string;
  proving_sentence_id?: string;
  read_aloud_text: string;
  next?: NextItemDTO | null;
};

export function toStudentProgress(raw: StudentProgressDTO): StudentProgressDTO {
  const picked = pickAllowlisted(raw as unknown as Record<string, unknown>, STUDENT_PROGRESS_ALLOWLIST);
  return picked as StudentProgressDTO;
}

export function toNextItem(raw: NextItemDTO): NextItemDTO {
  const copy = { ...raw };
  assertNoForbiddenKeys(copy as unknown as Record<string, unknown>, NEXT_ITEM_FORBIDDEN_KEYS);
  return copy;
}

export function toFeedback(raw: FeedbackDTO): FeedbackDTO {
  const copy = { ...raw };
  assertNoForbiddenKeys(copy as unknown as Record<string, unknown>, FEEDBACK_FORBIDDEN_KEYS);
  return copy;
}
