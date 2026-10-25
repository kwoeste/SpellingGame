import { subjectName } from "@/lib/admin/subject-names";
import type { ResolvedAnswer } from "@/lib/admin/answer-text";
import type { SubjectId } from "@/lib/content/types";

export const ZONE_LOW = 0.7;
export const ZONE_HIGH = 0.95;
export const ZONE_SET_POINT = 0.82;
export const MASTERY_GATE = 0.9;
export const DEFAULT_WEEKLY_XP_GOAL = 600;
export const DEFAULT_DAILY_MINUTES_GOAL = 15;

export type MasteryState = "not_started" | "missing" | "in_progress" | "mastered" | "review_due" | "rusty";

export type AlertKind = "hole" | "review_due" | "rusty" | "rushing";

export type Alert = {
  kind: AlertKind;
  title: string;
  detail: string;
  targetType?: "concept" | "chapter";
  targetId?: string;
  severity: 1 | 2 | 3;
};

export type GoalRing = {
  id: string;
  label: string;
  done: number;
  goal: number;
  /** True percent (can pass 100), or -1 when there is nothing to show. */
  pct: number;
  /** 0-100 for the drawn arc. */
  arcPct: number;
  /** Text inside the ring: "73%", "Goal met", or "—". */
  text: string;
  unit: string;
};

export type DayPoint = {
  day: string;
  minutes: number;
  xp: number;
  items: number;
  firstTry: number;
  firstTryCorrect: number;
  accuracy: number | null;
};

export type Overview = {
  learnerNickname: string;
  asOfEt: string;
  engagedMinutesToday: number;
  engagedMinutesWeek: number;
  xpTotal: number;
  xpToday: number;
  xpWeek: number;
  itemsCompleted: number;
  itemsAttempted: number;
  firstTryAccuracy: number | null;
  inTargetBand: boolean | null;
  streakDays: number;
  rings: GoalRing[];
  alerts: Alert[];
  daily: DayPoint[];
  weeklyAccuracy: { week: string; accuracy: number | null; items: number }[];
  /** Rapid wrong guesses (under 1.5 s) as a share of answers. */
  rushMeter: RushMeter;
};

export type RushMeter = {
  level: "calm" | "watch" | "rushing" | "none";
  rate7d: number | null;
  rushed7d: number;
  answers7d: number;
  rushedToday: number;
  daily: { day: string; rate: number | null; answers: number }[];
};

export type SubjectProgress = {
  subject: SubjectId;
  label: string;
  concepts: number;
  mastered: number;
  inProgress: number;
  missing: number;
  reviewDue: number;
  rusty: number;
  masteryPct: number;
  toward90: number;
  chaptersTotal: number;
  chaptersStarred: number;
  avgMilestone: number | null;
  frontier: number | null;
  gradeSpread: { band: string; count: number; mastered: number }[];
};

export type ChapterProgressRow = {
  chapterId: string;
  title: string;
  subject: SubjectId;
  book: string;
  number: number;
  itemsTotal: number;
  itemsCorrect: number;
  itemsAttempted: number;
  /** Share of items ever answered right (any try, any help). */
  masteryPct: number;
  /** Items whose latest first try was right with no big hint: the same rule the chapter star uses. */
  firstTryCorrect: number;
  firstTryPct: number;
  gated: boolean;
  lastSeenAt: number | null;
};

export type ProgressView = {
  subjects: SubjectProgress[];
  chapters: ChapterProgressRow[];
  trend: { day: string; mastered: number; accuracy: number | null }[];
};

export type KnowledgeNode = {
  id: string;
  subject: SubjectId;
  titleKid: string;
  titleAdmin: string;
  standardCodes: string[];
  milestoneLevel: number;
  kind: string;
  state: MasteryState;
  pMastery: number;
  theta: number;
  attempts: number;
  correctUnhinted: number;
  lastPracticedAt: number | null;
  reviewDueAt: number | null;
  efficientStrategyRate: number | null;
};

export type KnowledgeEdge = { from: string; to: string; strength: "hard" | "soft" };

export type KnowledgeMapView = {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  frontiers: { subject: SubjectId; domain: string; frontier: number | null }[];
};

export type WrongAnswerRow = {
  eventId: string;
  ts: number;
  subject: SubjectId | "unknown";
  chapterId: string | null;
  conceptId: string;
  conceptTitle: string;
  itemId: string;
  itemText: string;
  response: unknown;
  responseText: string;
  /** Her answer in words, with wrong parts marked. */
  herAnswer: ResolvedAnswer;
  /** The correct answer in words. */
  correct: ResolvedAnswer;
  correctAnswer: string;
  /** e.g. "Christ Our Life Ch 4". */
  chapterLabel: string | null;
  attemptNo: number | null;
  hintLevel: number | null;
  latencyMs: number | null;
  strategy: string | null;
  strategySource: string | null;
  strategyConfidence: number | null;
  misconception: string | null;
  firstAttempt: boolean;
};

export type StrategyPattern = {
  key: string;
  label: string;
  count: number;
  detail: string;
};

/** One item she got stuck on (reached the stuck-help ladder's strong hint, Show me, or skipped). */
export type NeedsReteachRow = {
  key: string;
  source: "chapter" | "watch_check" | "game";
  label: string;
  chapterId: string | null;
  conceptId: string | null;
  /** Most wrong tries in one sitting. */
  maxMisses: number;
  hints: number;
  reveals: number;
  skips: number;
  lastTs: number;
  /** Later got it right on the first try with no help. */
  cleared: boolean;
};

export type WrongAnswerView = {
  rows: WrongAnswerRow[];
  patterns: StrategyPattern[];
  needsReteach: NeedsReteachRow[];
};

export type PaceFlag = "ok" | "skim" | "skip" | "rush";

export type SessionHistoryRow = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  /** Last thing she did in the session (answer, hint, or heartbeat). */
  lastActivityAt: number;
  /** When she answered her first question, if any. */
  firstQuestionAt: number | null;
  entryPoint: string;
  engagedMinutes: number;
  idleMinutes: number;
  items: number;
  firstTryAccuracy: number | null;
  xp: number;
  pace: PaceFlag;
  paceNote: string;
  rollingSuccess: number;
  /** Items she needed the stuck-help ladder on in this session. */
  neededHelp: number;
};

export type SessionHistoryView = {
  sessions: SessionHistoryRow[];
};

export type AssignmentKind = "manual" | "hole_fill";
export type AssignmentTarget = "concept" | "chapter" | "game";
export type AssignmentStatus = "open" | "paused" | "done" | "cancelled";

export type AssignmentRow = {
  id: string;
  learnerId: string;
  kind: AssignmentKind;
  targetType: AssignmentTarget;
  targetId: string;
  title: string;
  reason: string | null;
  status: AssignmentStatus;
  createdBy: string;
  createdAt: number;
  completedAt: number | null;
};

export type LearnerGoal = {
  learnerId: string;
  weeklyXpGoal: number;
  dailyMinutesGoal: number;
  updatedAt: number;
  updatedBy: string;
};

export type AssignTargetOption = {
  id: string;
  title: string;
  /** Subject id, used to group the dropdown ("ela", "math", ...). */
  subject?: string;
};

export type AssignmentsView = {
  assignments: AssignmentRow[];
  suggestedHoles: Alert[];
  goal: LearnerGoal;
  concepts: AssignTargetOption[];
  chapters: AssignTargetOption[];
  /** Chapters whose star is already earned (gate passed or overridden). */
  gatedChapterIds: string[];
};

export function isMasteryState(value: string): value is MasteryState {
  return (
    value === "not_started" ||
    value === "missing" ||
    value === "in_progress" ||
    value === "mastered" ||
    value === "review_due" ||
    value === "rusty"
  );
}

/** Plain subject name. Never throws: unknown or missing subjects read "Other". */
export function subjectLabel(subject: SubjectId | "unknown" | string | null | undefined): string {
  return subjectName(subject);
}
