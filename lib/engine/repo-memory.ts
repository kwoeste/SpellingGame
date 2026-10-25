import type {
  AdminRepo,
  AssignmentRecord,
  EngineRepo,
  FirstAnswer,
  GateAttempt,
  ItemRating,
  SessionPlanRecord,
  ModalityEpisode,
  LearnerGoalRecord,
  LearnerTx,
  LikeRow,
  MasteryRow,
  PlaySession,
  ReviewRow,
  StoredEvent,
  StrategyRow,
} from "@/lib/engine/repo";

type MemoryState = {
  sessions: Map<string, PlaySession>;
  events: StoredEvent[];
  eventIds: Set<string>;
  mastery: Map<string, MasteryRow & { learnerId: string }>;
  reviews: Map<string, ReviewRow & { learnerId: string }>;
  ratings: Map<string, ItemRating>;
  decisions: Record<string, unknown>[];
  gates: (GateAttempt & { learnerId: string })[];
  xp: Map<string, { learnerId: string; sessionId: string; minuteStart: number; xp: number }>;
  likes: { learnerId: string; interestTag: string; liked: boolean; ts: number }[];
  configs: { version: string; json: Record<string, unknown>; createdBy: string }[];
  strategies: Array<StrategyRow & { learnerId: string; id: string }>;
  assignments: AssignmentRecord[];
  goals: Map<string, LearnerGoalRecord>;
  plans: Map<string, SessionPlanRecord & { learnerId: string }>;
  episodes: (ModalityEpisode & { learnerId: string })[];
};

function emptyState(): MemoryState {
  return {
    sessions: new Map(),
    events: [],
    eventIds: new Set(),
    mastery: new Map(),
    reviews: new Map(),
    ratings: new Map(),
    decisions: [],
    gates: [],
    xp: new Map(),
    likes: [],
    configs: [],
    strategies: [],
    assignments: [],
    goals: new Map(),
    plans: new Map(),
    episodes: [],
  };
}

let state = emptyState();

export function resetMemoryRepo(): void {
  state = emptyState();
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function answersFor(learnerId: string, itemIds: string[], since: number): StoredEvent[] {
  const wanted = new Set(itemIds);
  return state.events
    .filter(
      (e) =>
        e.learnerId === learnerId &&
        e.type === "answer_submitted" &&
        !e.isPreview &&
        e.itemId !== null &&
        wanted.has(e.itemId) &&
        e.serverTs > since,
    )
    .sort((a, b) => a.serverTs - b.serverTs || a.seq - b.seq);
}

class MemoryLearnerTx implements LearnerTx {
  constructor(readonly learnerId: string) {}

  async getSession(id: string) {
    const s = state.sessions.get(id);
    return s && s.learnerId === this.learnerId ? clone(s) : null;
  }

  async latestOpenSession() {
    const open = [...state.sessions.values()]
      .filter((s) => s.learnerId === this.learnerId && !s.endedAt && !s.isPreview)
      .sort((a, b) => b.lastEventAt - a.lastEventAt)[0];
    return open ? clone(open) : null;
  }

  async insertSession(session: PlaySession) {
    state.sessions.set(session.id, clone({ ...session, learnerId: this.learnerId }));
  }

  async updateSession(session: PlaySession) {
    const existing = state.sessions.get(session.id);
    if (existing && existing.learnerId === this.learnerId) state.sessions.set(session.id, clone(session));
  }

  async insertEvent(event: StoredEvent) {
    if (state.eventIds.has(event.id)) return false;
    state.eventIds.add(event.id);
    state.events.push(clone({ ...event, learnerId: this.learnerId }));
    return true;
  }

  async countAnswers(sessionId: string, itemId: string) {
    return state.events.filter(
      (e) =>
        e.learnerId === this.learnerId &&
        e.sessionId === sessionId &&
        e.itemId === itemId &&
        e.type === "answer_submitted",
    ).length;
  }

  async firstAnswersSince(itemIds: string[], since: number): Promise<FirstAnswer[]> {
    const seen = new Map<string, FirstAnswer>();
    for (const e of answersFor(this.learnerId, itemIds, since)) {
      if (!seen.has(e.itemId as string)) {
        seen.set(e.itemId as string, { itemId: e.itemId as string, isCorrect: Boolean(e.isCorrect), hintLevel: e.hintLevel ?? 0 });
      }
    }
    return [...seen.values()];
  }

  async correctItemsSince(itemIds: string[], since: number) {
    return new Set(answersFor(this.learnerId, itemIds, since).filter((e) => e.isCorrect).map((e) => e.itemId as string));
  }

  async lastEventOfType(type: string, activityId: string, since: number) {
    const hits = state.events.filter(
      (e) => e.learnerId === this.learnerId && e.type === type && e.activityId === activityId && e.serverTs > since,
    );
    return hits.length ? Math.max(...hits.map((e) => e.serverTs)) : null;
  }

  async answeredItemIds() {
    return new Set(
      state.events
        .filter((e) => e.learnerId === this.learnerId && e.type === "answer_submitted" && !e.isPreview && e.itemId)
        .map((e) => e.itemId as string),
    );
  }

  async getMastery(conceptId: string) {
    const row = state.mastery.get(`${this.learnerId}:${conceptId}`);
    if (!row) return null;
    const { learnerId: _ignored, ...rest } = row;
    return clone(rest);
  }

  async upsertMastery(row: MasteryRow) {
    state.mastery.set(`${this.learnerId}:${row.conceptId}`, clone({ ...row, learnerId: this.learnerId }));
  }

  async getReview(targetType: string, targetId: string) {
    const row = state.reviews.get(`${this.learnerId}:${targetType}:${targetId}`);
    if (!row) return null;
    const { learnerId: _ignored, ...rest } = row;
    return clone(rest);
  }

  async upsertReview(row: ReviewRow) {
    state.reviews.set(`${this.learnerId}:${row.targetType}:${row.targetId}`, clone({ ...row, learnerId: this.learnerId }));
  }

  async getGoal() {
    const goal = state.goals.get(this.learnerId);
    return goal ? clone(goal) : null;
  }

  async openAssignments() {
    return clone(state.assignments.filter((row) => row.learnerId === this.learnerId && row.status === "open").sort((a, b) => a.createdAt - b.createdAt));
  }

  async eventsSince(since: number, types: string[]) {
    return clone(
      state.events
        .filter((e) => e.learnerId === this.learnerId && !e.isPreview && e.serverTs > since && types.includes(e.type))
        .sort((a, b) => a.serverTs - b.serverTs),
    );
  }

  async getSessionPlan(loginId: string) {
    const row = state.plans.get(`${this.learnerId}:${loginId}`);
    if (!row) return null;
    const { learnerId: _ignored, ...rest } = row;
    return clone(rest);
  }

  async saveSessionPlan(row: SessionPlanRecord) {
    const key = `${this.learnerId}:${row.loginId}`;
    if (!state.plans.has(key)) state.plans.set(key, clone({ ...row, learnerId: this.learnerId }));
  }

  async insertEpisode(row: ModalityEpisode) {
    state.episodes.push(clone({ ...row, learnerId: this.learnerId }));
  }
  async openEpisode(itemId: string) {
    const open = state.episodes.filter((e) => e.learnerId === this.learnerId && e.itemId === itemId && e.resolvedAt === null);
    const last = open.sort((a, b) => b.startedAt - a.startedAt)[0];
    if (!last) return null;
    const { learnerId: _l, ...rest } = last;
    void _l;
    return clone(rest);
  }
  async resolveEpisode(id: string, success: boolean, at: number) {
    const row = state.episodes.find((e) => e.id === id && e.learnerId === this.learnerId);
    if (row && row.resolvedAt === null) Object.assign(row, { success, resolvedAt: at });
  }
  async listEpisodes() {
    return clone(state.episodes.filter((e) => e.learnerId === this.learnerId).map(({ learnerId: _l, ...rest }) => (void _l, rest)));
  }
  async aiPlanAttempts(day: string) {
    return [...state.plans.values()].filter((row) => row.learnerId === this.learnerId && row.day === day && row.aiAttempted).length;
  }

  async listReviews(targetType: string) {
    const out: ReviewRow[] = [];
    for (const row of state.reviews.values()) {
      if (row.learnerId !== this.learnerId || row.targetType !== targetType) continue;
      const { learnerId: _ignored, ...rest } = row;
      out.push(clone(rest));
    }
    return out;
  }

  async getItemRating(itemId: string) {
    const rating = state.ratings.get(itemId);
    return rating ? clone(rating) : null;
  }

  async upsertItemRating(rating: ItemRating) {
    state.ratings.set(rating.itemId, clone(rating));
  }

  async insertDecision(sessionId: string, decision: string, reasonCode: string, inputs: Record<string, unknown>) {
    state.decisions.push({ learnerId: this.learnerId, sessionId, decision, reasonCode, inputs, ts: Date.now() });
  }

  async lastGateAttempt(scope: GateAttempt["scope"], scopeId: string) {
    const rows = state.gates.filter((g) => g.learnerId === this.learnerId && g.scope === scope && g.scopeId === scopeId);
    const last = rows.sort((a, b) => b.finishedAt - a.finishedAt)[0];
    if (!last) return null;
    const { learnerId: _ignored, ...rest } = last;
    return clone(rest);
  }

  async insertGateAttempt(attempt: GateAttempt) {
    state.gates.push(clone({ ...attempt, learnerId: this.learnerId }));
  }

  async passedGateScopeIds(scope: GateAttempt["scope"]) {
    return [...new Set(state.gates.filter((g) => g.learnerId === this.learnerId && g.scope === scope && g.passed).map((g) => g.scopeId))];
  }

  async firstPassedAt(scope: GateAttempt["scope"]) {
    const out = new Map<string, number>();
    for (const g of state.gates) {
      if (g.learnerId !== this.learnerId || g.scope !== scope || !g.passed) continue;
      const t = g.finishedAt ?? g.startedAt;
      const prev = out.get(g.scopeId);
      if (prev === undefined || t < prev) out.set(g.scopeId, t);
    }
    return out;
  }

  async awardXp(sessionId: string, minuteStart: number, xp: number) {
    const key = `${sessionId}:${minuteStart}`;
    if (state.xp.has(key)) return false;
    state.xp.set(key, { learnerId: this.learnerId, sessionId, minuteStart, xp });
    return true;
  }

  async xpRows() {
    return [...state.xp.values()].filter((r) => r.learnerId === this.learnerId).map(({ minuteStart, xp }) => ({ minuteStart, xp }));
  }

  async saveLikes(tags: LikeRow[]) {
    const now = Date.now();
    for (const tag of tags) state.likes.push({ learnerId: this.learnerId, interestTag: tag.interestTag, liked: tag.liked, ts: now });
  }

  async getLikes() {
    const latest = new Map<string, LikeRow>();
    for (const row of state.likes.filter((r) => r.learnerId === this.learnerId)) {
      latest.set(row.interestTag, { interestTag: row.interestTag, liked: row.liked });
    }
    return [...latest.values()];
  }

  async insertStrategy(row: StrategyRow) {
    state.strategies.push({ ...clone(row), learnerId: this.learnerId, id: crypto.randomUUID() });
  }
}

export const memoryEngineRepo: EngineRepo = {
  async withLearner(learnerId, work) {
    return work(new MemoryLearnerTx(learnerId));
  },
};

export const memoryAdminRepo: AdminRepo = {
  async mastery() {
    return clone([...state.mastery.values()]);
  },
  async wrongAnswers(limit) {
    return clone(state.events.filter((e) => e.type === "answer_submitted" && e.isCorrect === false && !e.isPreview).slice(-limit).reverse());
  },
  async events(limit) {
    return clone(state.events.slice(-limit).reverse());
  },
  async decisions(limit) {
    return clone(state.decisions.slice(-limit).reverse());
  },
  async likes() {
    const latest = new Map<string, LikeRow & { learnerId: string }>();
    for (const row of state.likes) latest.set(`${row.learnerId}:${row.interestTag}`, { learnerId: row.learnerId, interestTag: row.interestTag, liked: row.liked });
    return [...latest.values()];
  },
  async engagedMinutesByDay() {
    const byDay = new Map<string, number>();
    for (const row of state.xp.values()) {
      const day = new Date(row.minuteStart).toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return [...byDay.entries()].map(([day, minutes]) => ({ day, minutes }));
  },
  async counts() {
    return { events: state.events.length, mastery: state.mastery.size, reviews: state.reviews.size };
  },
  async activeConfig() {
    return state.configs.at(-1)?.json ?? null;
  },
  async saveConfig(config, createdBy) {
    const version = `v${state.configs.length + 2}-${Date.now()}`;
    state.configs.push({ version, json: clone(config), createdBy });
    return version;
  },
  async sessions(limit) {
    return clone([...state.sessions.values()].sort((a, b) => b.startedAt - a.startedAt).slice(0, limit));
  },
  async reviews() {
    return clone([...state.reviews.values()]);
  },
  async xpLedger() {
    return clone([...state.xp.values()]);
  },
  async strategies(limit) {
    return clone(state.strategies.slice(-limit).reverse());
  },
  async gatedChapterIds(learnerId) {
    return [...new Set(state.gates.filter((g) => g.learnerId === learnerId && g.scope === "chapter" && g.passed).map((g) => g.scopeId))];
  },
  async overrideChapterGate({ learnerId, chapterId, by, reason, at }) {
    state.gates.push({ scope: "chapter", scopeId: chapterId, itemIds: [], score: 0, passed: true, startedAt: at, finishedAt: at, learnerId, overrideBy: by, overrideReason: reason });
  },
  async assignments() {
    return clone(state.assignments);
  },
  async createAssignment(row) {
    const created: AssignmentRecord = {
      ...clone(row),
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      completedAt: null,
    };
    state.assignments.push(created);
    return clone(created);
  },
  async updateAssignment(id, patch) {
    const found = state.assignments.find((row) => row.id === id);
    if (!found) return null;
    Object.assign(found, patch);
    return clone(found);
  },
  async modalityEpisodes() {
    return clone(state.episodes);
  },
  async sessionPlans(sinceDay: string) {
    return clone([...state.plans.values()].filter((row) => row.day >= sinceDay).sort((a, b) => b.createdAt - a.createdAt));
  },
  async goals() {
    return clone([...state.goals.values()]);
  },
  async upsertGoal(goal) {
    state.goals.set(goal.learnerId, clone(goal));
  },
  async relabelStrategy(eventId, learnerId, strategy, createdBy) {
    state.strategies.push({
      id: crypto.randomUUID(),
      eventId,
      learnerId,
      conceptId: null,
      strategy,
      source: "admin_label",
      confidence: 1,
      misconception: null,
      isCorrect: null,
      features: { labeled_by: createdBy },
    } as StrategyRow & { learnerId: string; id: string });
  },
};
