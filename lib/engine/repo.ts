import type { ReviewBox } from "@/lib/engine/scheduler";

export type MasteryRow = {
  conceptId: string;
  pMastery: number;
  theta: number;
  thetaN: number;
  state: string;
  attempts: number;
  correctUnhinted: number;
  gatePassedAt: number | null;
  lastPracticedAt: number | null;
};

export type ReviewRow = {
  targetType: string;
  targetId: string;
  box: ReviewBox;
  dueAt: number;
  lastResult: "pass" | "fail" | null;
  lapses: number;
};

export type ResumeState = {
  chapterId: string | null;
  activityId: string | null;
  itemId: string | null;
  scaffoldLevel: number;
};

export type PlaySession = {
  id: string;
  learnerId: string;
  startedAt: number;
  lastEventAt: number;
  endedAt: number | null;
  entryPoint: string;
  resumeState: ResumeState;
  isPreview: boolean;
  rollingSuccess: number;
  scoredCount: number;
  consecutiveHigh: number;
  outOfBand: number;
};

export type StoredEvent = {
  id: string;
  sessionId: string;
  learnerId: string;
  seq: number;
  clientTs: number | null;
  serverTs: number;
  type: string;
  itemId: string | null;
  activityId: string | null;
  attemptNo: number | null;
  response: unknown;
  isCorrect: boolean | null;
  latencyMs: number | null;
  hintLevel: number | null;
  payload: Record<string, unknown> | null;
  isPreview: boolean;
};

export type ItemRating = { itemId: string; difficulty: number; seed: number; n: number };

export type FirstAnswer = { itemId: string; isCorrect: boolean; hintLevel: number };

export type GateAttempt = {
  scope: "concept" | "chapter";
  scopeId: string;
  itemIds: string[];
  score: number;
  passed: boolean;
  startedAt: number;
  finishedAt: number;
};

export type LikeRow = { interestTag: string; liked: boolean };

/** Every method is scoped to the learner the transaction was opened for. */
export interface LearnerTx {
  readonly learnerId: string;
  getSession(id: string): Promise<PlaySession | null>;
  latestOpenSession(): Promise<PlaySession | null>;
  insertSession(session: PlaySession): Promise<void>;
  updateSession(session: PlaySession): Promise<void>;
  /** Returns false when an event with the same id already exists (idempotent retry). */
  insertEvent(event: StoredEvent): Promise<boolean>;
  countAnswers(sessionId: string, itemId: string): Promise<number>;
  /** Earliest non-preview answer per item strictly after `since`. */
  firstAnswersSince(itemIds: string[], since: number): Promise<FirstAnswer[]>;
  /** Items with at least one correct non-preview answer after `since`. */
  correctItemsSince(itemIds: string[], since: number): Promise<Set<string>>;
  lastEventOfType(type: string, activityId: string, since: number): Promise<number | null>;
  answeredItemIds(): Promise<Set<string>>;
  getMastery(conceptId: string): Promise<MasteryRow | null>;
  upsertMastery(row: MasteryRow): Promise<void>;
  getReview(targetType: string, targetId: string): Promise<ReviewRow | null>;
  upsertReview(row: ReviewRow): Promise<void>;
  getItemRating(itemId: string): Promise<ItemRating | null>;
  upsertItemRating(rating: ItemRating): Promise<void>;
  insertDecision(sessionId: string, decision: string, reasonCode: string, inputs: Record<string, unknown>): Promise<void>;
  lastGateAttempt(scope: GateAttempt["scope"], scopeId: string): Promise<GateAttempt | null>;
  insertGateAttempt(attempt: GateAttempt): Promise<void>;
  passedGateScopeIds(scope: GateAttempt["scope"]): Promise<string[]>;
  /** Returns true when the minute was newly awarded (unique per session and minute). */
  awardXp(sessionId: string, minuteStart: number, xp: number): Promise<boolean>;
  xpRows(): Promise<{ minuteStart: number; xp: number }[]>;
  saveLikes(tags: LikeRow[]): Promise<void>;
  getLikes(): Promise<LikeRow[]>;
}

export interface EngineRepo {
  withLearner<T>(learnerId: string, work: (tx: LearnerTx) => Promise<T>): Promise<T>;
}

export type AdminMasteryRow = MasteryRow & { learnerId: string };
export type AdminEventRow = StoredEvent;

export interface AdminRepo {
  mastery(): Promise<AdminMasteryRow[]>;
  wrongAnswers(limit: number): Promise<AdminEventRow[]>;
  events(limit: number): Promise<AdminEventRow[]>;
  decisions(limit: number): Promise<Record<string, unknown>[]>;
  likes(): Promise<(LikeRow & { learnerId: string })[]>;
  engagedMinutesByDay(): Promise<{ day: string; minutes: number }[]>;
  counts(): Promise<{ events: number; mastery: number; reviews: number }>;
  activeConfig(): Promise<Record<string, unknown> | null>;
  saveConfig(config: Record<string, unknown>, createdBy: string): Promise<string>;
}
