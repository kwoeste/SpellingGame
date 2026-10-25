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
  overrideBy?: string | null;
  overrideReason?: string | null;
};

export type LikeRow = { interestTag: string; liked: boolean };

export type StrategyRow = {
  eventId: string;
  conceptId: string | null;
  strategy: string;
  source: string;
  confidence: number | null;
  misconception: string | null;
  isCorrect: boolean | null;
};

export type AssignmentRecord = {
  id: string;
  learnerId: string;
  kind: "manual" | "hole_fill";
  targetType: "concept" | "chapter" | "game";
  targetId: string;
  title: string;
  reason: string | null;
  status: "open" | "paused" | "done" | "cancelled";
  createdBy: string;
  createdAt: number;
  completedAt: number | null;
};

export type LearnerGoalRecord = {
  learnerId: string;
  weeklyXpGoal: number;
  dailyMinutesGoal: number;
  updatedAt: number;
  updatedBy: string;
};

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
  /** Every review row of one target type for this learner. */
  listReviews(targetType: string): Promise<ReviewRow[]>;
  getItemRating(itemId: string): Promise<ItemRating | null>;
  upsertItemRating(rating: ItemRating): Promise<void>;
  insertDecision(sessionId: string, decision: string, reasonCode: string, inputs: Record<string, unknown>): Promise<void>;
  lastGateAttempt(scope: GateAttempt["scope"], scopeId: string): Promise<GateAttempt | null>;
  insertGateAttempt(attempt: GateAttempt): Promise<void>;
  passedGateScopeIds(scope: GateAttempt["scope"]): Promise<string[]>;
  /** Earliest pass time (ms) per scope id, for passed gates only. */
  firstPassedAt(scope: GateAttempt["scope"]): Promise<Map<string, number>>;
  /** Returns true when the minute was newly awarded (unique per session and minute). */
  awardXp(sessionId: string, minuteStart: number, xp: number): Promise<boolean>;
  xpRows(): Promise<{ minuteStart: number; xp: number }[]>;
  saveLikes(tags: LikeRow[]): Promise<void>;
  getLikes(): Promise<LikeRow[]>;
  insertStrategy(row: StrategyRow): Promise<void>;
  /** The learner's goal row (daily minutes, weekly XP), if an admin set one. */
  getGoal(): Promise<LearnerGoalRecord | null>;
  /** Open assignments for this learner, oldest first. */
  openAssignments(): Promise<AssignmentRecord[]>;
  /** Non-preview events of the given types strictly after `since`, oldest first. */
  eventsSince(since: number, types: string[]): Promise<StoredEvent[]>;
  getSessionPlan(loginId: string): Promise<SessionPlanRecord | null>;
  /** Insert once per sign-in; a concurrent duplicate is ignored. */
  saveSessionPlan(row: SessionPlanRecord): Promise<void>;
  /** Sign-ins on this ET day that called the AI planner (for the per-day safety cap). */
  aiPlanAttempts(day: string): Promise<number>;
  insertEpisode(row: ModalityEpisode): Promise<void>;
  /** Latest unresolved episode for this item, if any. */
  openEpisode(itemId: string): Promise<ModalityEpisode | null>;
  resolveEpisode(id: string, outcome: EpisodeOutcome, at: number): Promise<void>;
  /** Every episode for this learner (small: one per re-teach). */
  listEpisodes(): Promise<ModalityEpisode[]>;
  /** Latest Grok/deterministic learning insight for this learner (chooser prior, planner hint). */
  latestInsight(): Promise<LearningInsight | null>;
}

export type Modality = "watch" | "read" | "retry" | "nlm_video" | "nlm_podcast" | "nlm_flashcards";
export type EpisodeContext = "reteach" | "first_teach";
/** Scored on her next answer to the episode's item: same rule for every modality. */
export type EpisodeOutcome = { success: boolean; latencyMs: number | null; rushed: boolean };
export type ModalityEpisode = {
  id: string;
  itemId: string;
  conceptId: string;
  subject: string;
  context: EpisodeContext;
  modality: Modality;
  chosenBy: "thompson" | "explore" | "only_option";
  samples: Record<string, number>;
  startedAt: number;
  resolvedAt: number | null;
  success: boolean | null;
  followupLatencyMs?: number | null;
  followupRushed?: boolean | null;
};

/** Per-subject suggested modality weights (each 0..1, relative). */
export type ModalityWeights = Record<string, Partial<Record<Modality, number>>>;

export type LearningInsight = {
  id: string;
  createdAt: number;
  trigger: "weekly" | "admin";
  source: "ai" | "deterministic";
  model: string | null;
  stats: Record<string, unknown>;
  summary: string;
  confidence: string;
  weights: ModalityWeights;
  requestedBy: string | null;
};

export type SessionPlanRecord = {
  loginId: string;
  day: string;
  plan: Record<string, unknown>;
  source: "deterministic" | "ai";
  aiAttempted: boolean;
  createdAt: number;
};

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
  sessions(limit: number): Promise<PlaySession[]>;
  reviews(): Promise<Array<ReviewRow & { learnerId: string }>>;
  xpLedger(): Promise<Array<{ learnerId: string; sessionId: string; minuteStart: number; xp: number }>>;
  strategies(limit: number): Promise<Array<StrategyRow & { learnerId: string }>>;
  gatedChapterIds(learnerId: string): Promise<string[]>;
  /** Parent override: record a passed chapter gate without a score. */
  overrideChapterGate(args: { learnerId: string; chapterId: string; by: string; reason: string | null; at: number }): Promise<void>;
  assignments(): Promise<AssignmentRecord[]>;
  createAssignment(row: Omit<AssignmentRecord, "id" | "createdAt" | "completedAt">): Promise<AssignmentRecord>;
  updateAssignment(id: string, patch: Partial<Pick<AssignmentRecord, "status" | "completedAt">>): Promise<AssignmentRecord | null>;
  goals(): Promise<LearnerGoalRecord[]>;
  sessionPlans(sinceDay: string): Promise<Array<SessionPlanRecord & { learnerId: string }>>;
  modalityEpisodes(): Promise<Array<ModalityEpisode & { learnerId: string }>>;
  /** First-try, non-preview answers (concept id, correctness, time) for retention stats. */
  firstTryAnswers(learnerId: string, since: number): Promise<Array<{ conceptId: string; isCorrect: boolean; serverTs: number }>>;
  insights(learnerId: string, limit: number): Promise<LearningInsight[]>;
  insertInsight(learnerId: string, row: LearningInsight): Promise<void>;
  upsertGoal(goal: LearnerGoalRecord): Promise<void>;
  relabelStrategy(eventId: string, learnerId: string, strategy: string, createdBy: string): Promise<void>;
}
