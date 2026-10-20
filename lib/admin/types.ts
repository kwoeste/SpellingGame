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
  pct: number;
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
  masteryPct: number;
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
  correctAnswer: string;
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

export type WrongAnswerView = {
  rows: WrongAnswerRow[];
  patterns: StrategyPattern[];
};

export type PaceFlag = "ok" | "skim" | "skip" | "rush";

export type SessionHistoryRow = {
  id: string;
  startedAt: number;
  endedAt: number | null;
  entryPoint: string;
  engagedMinutes: number;
  idleMinutes: number;
  items: number;
  firstTryAccuracy: number | null;
  xp: number;
  pace: PaceFlag;
  paceNote: string;
  rollingSuccess: number;
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

export type AssignmentsView = {
  assignments: AssignmentRow[];
  suggestedHoles: Alert[];
  goal: LearnerGoal;
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

export function subjectLabel(subject: SubjectId): string {
  switch (subject) {
    case "math":
      return "Math";
    case "science":
      return "Science";
    case "ela":
      return "ELA";
    case "religion":
      return "Religion";
    default: {
      const unhandled: never = subject;
      throw new Error(`Unhandled subject: ${String(unhandled)}`);
    }
  }
}
