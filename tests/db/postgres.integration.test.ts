import { readFileSync } from "node:fs";
import path from "node:path";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { listAudit, writeAudit } from "@/lib/auth/audit";
import { clearUserCache, resolveUser, SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { getChapter } from "@/lib/content/catalog";
import type { ChapterItem } from "@/lib/content/types";
import { setPoolFactoryForTests, type DbPool, type DbRole } from "@/lib/db/client";
import { adminRepo, engineRepo } from "@/lib/engine/repos";
import { progressSummary, saveLikes, startSession, submitAnswer, type EngineActor } from "@/lib/engine/service";

/**
 * Applies migrations 001-003 to a throwaway database and drives the real repo through the
 * app_student / app_admin / assistant_ro roles. Needs a superuser URL, e.g.
 * TEST_PG_SUPERUSER_URL=postgresql://it_owner:it_owner@127.0.0.1/postgres npm test
 * Note: sets passwords on the cluster-wide app_student, app_admin, and assistant_ro roles.
 */
const SUPERUSER_URL = process.env.TEST_PG_SUPERUSER_URL;
const suite = SUPERUSER_URL ? describe : describe.skip;

const OTHER_LEARNER = "22222222-2222-2222-2222-222222222222";
const mae: EngineActor = { role: "student", learnerId: SEEDED_LEARNER_ID };
const sibling: EngineActor = { role: "student", learnerId: OTHER_LEARNER };

function urlFor(base: string, database: string, user?: string, password?: string): string {
  const url = new URL(base);
  url.pathname = `/${database}`;
  if (user) url.username = user;
  if (password) url.password = password;
  return url.toString();
}

function migration(name: string): string {
  return readFileSync(path.join(process.cwd(), "db/migrations", name), "utf8");
}

function rightAnswer(item: ChapterItem): unknown {
  return item.type === "tap_evidence" ? { choice: item.answer, evidence: item.evidenceSentenceId } : item.answer;
}

suite("Postgres persistence and RLS (migrations 001-003)", () => {
  const database = `mae_it_${Date.now()}`;
  const roleUrls = {} as Record<DbRole, string>;
  let ownerUrl = "";

  async function asRole<T>(role: DbRole, learnerId: string | null, work: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: roleUrls[role] });
    await client.connect();
    try {
      await client.query("BEGIN");
      if (learnerId) await client.query("select set_config('app.learner_id', $1, true)", [learnerId]);
      return await work(client);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      await client.end();
    }
  }

  async function asOwner<T>(work: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: ownerUrl });
    await client.connect();
    try {
      return await work(client);
    } finally {
      await client.end();
    }
  }

  beforeAll(async () => {
    const root = new Client({ connectionString: SUPERUSER_URL });
    await root.connect();
    await root.query(`CREATE DATABASE ${database}`);
    await root.end();
    ownerUrl = urlFor(SUPERUSER_URL as string, database);
    await asOwner(async (owner) => {
      for (const file of ["001_engine_schema.sql", "002_seed_users.sql", "003_runtime_persistence.sql", "003_runtime_persistence.sql"]) {
        await owner.query(migration(file));
      }
      await owner.query("ALTER ROLE app_student PASSWORD 'it_student'");
      await owner.query("ALTER ROLE app_admin PASSWORD 'it_admin'");
      await owner.query("ALTER ROLE assistant_ro PASSWORD 'it_assistant'");
      await owner.query("INSERT INTO engine.learner (id, nickname, grade_enrolled) VALUES ($1, 'Sib', 2)", [OTHER_LEARNER]);
    });
    roleUrls.student = urlFor(SUPERUSER_URL as string, database, "app_student", "it_student");
    roleUrls.admin = urlFor(SUPERUSER_URL as string, database, "app_admin", "it_admin");
    roleUrls.assistant = urlFor(SUPERUSER_URL as string, database, "assistant_ro", "it_assistant");
    setPoolFactoryForTests((role) => new Pool({ connectionString: roleUrls[role], max: 2 }) as unknown as DbPool);
  });

  afterAll(async () => {
    setPoolFactoryForTests(null);
    const root = new Client({ connectionString: SUPERUSER_URL });
    await root.connect();
    await root.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`);
    await root.end();
  });

  beforeEach(() => clearUserCache());

  it("resolves users from engine.app_user and honours disabled_at", async () => {
    expect(await resolveUser("Mae.Woeste@gmail.com")).toMatchObject({ role: "student", learnerId: SEEDED_LEARNER_ID });
    expect(await resolveUser("kevinw@mcsteen.com")).toMatchObject({ role: "admin", learnerId: null });
    await asOwner((owner) => owner.query("UPDATE engine.app_user SET disabled_at = now() WHERE email = 'molly.woeste@gmail.com'"));
    expect(await resolveUser("molly.woeste@gmail.com")).toBeNull();
    await asOwner((owner) => owner.query("UPDATE engine.app_user SET disabled_at = NULL WHERE email = 'molly.woeste@gmail.com'"));
  });

  it("persists a full chapter round through the student role and passes the gate", async () => {
    const chapter = getChapter("savvas.ch1");
    if (!chapter) throw new Error("missing chapter");
    const { sessionId } = await startSession(engineRepo(), mae, { entryPoint: "study", chapterId: chapter.id });
    let last = null;
    for (const item of chapter.items) {
      last = await submitAnswer(engineRepo(), mae, { sessionId, itemId: item.id, response: rightAnswer(item), latencyMs: 8000 });
    }
    expect(last?.gate).toMatchObject({ passed: true });
    const summary = await progressSummary(engineRepo(), mae);
    expect(summary.badges).toContain("savvas.ch1-star");
    expect(summary.xp_total).toBeGreaterThan(0);
    const counts = await asOwner(async (owner) => (await owner.query("SELECT count(*)::int AS n FROM engine.interaction_event")).rows[0].n);
    expect(counts).toBe(chapter.items.length);
  });

  it("isolates learners for app_student and shows every learner to app_admin", async () => {
    const chapter = getChapter("savvas.ch2");
    if (!chapter) throw new Error("missing chapter");
    await submitAnswer(engineRepo(), sibling, { itemId: chapter.items[0].id, response: rightAnswer(chapter.items[0]), latencyMs: 8000 });

    const seenByMae = await asRole("student", SEEDED_LEARNER_ID, async (c) =>
      (await c.query("SELECT DISTINCT learner_id::text AS id FROM engine.interaction_event")).rows.map((r) => r.id),
    );
    expect(seenByMae).toEqual([SEEDED_LEARNER_ID]);
    const unscoped = await asRole("student", null, async (c) => (await c.query("SELECT count(*)::int AS n FROM engine.interaction_event")).rows[0].n);
    expect(unscoped).toBe(0);
    await expect(
      asRole("student", SEEDED_LEARNER_ID, (c) =>
        c.query("INSERT INTO engine.xp_ledger (learner_id, session_id, minute_start, xp, reason) VALUES ($1, gen_random_uuid(), now(), 10, 'forged')", [OTHER_LEARNER]),
      ),
    ).rejects.toThrow(/row-level security/);

    const learners = new Set((await adminRepo().events(100)).map((e) => e.learnerId));
    expect(learners).toEqual(new Set([SEEDED_LEARNER_ID, OTHER_LEARNER]));
    expect(new Set((await adminRepo().mastery()).map((m) => m.learnerId)).size).toBe(2);
  });

  it("keeps app.learner_id transaction-local", async () => {
    const client = new Client({ connectionString: roleUrls.student });
    await client.connect();
    try {
      await client.query("BEGIN");
      await client.query("select set_config('app.learner_id', $1, true)", [SEEDED_LEARNER_ID]);
      await client.query("COMMIT");
      const { rows } = await client.query("SELECT count(*)::int AS n FROM engine.session");
      expect(rows[0].n).toBe(0);
    } finally {
      await client.end();
    }
  });

  it("student_api views run with the caller's rights", async () => {
    await saveLikes(engineRepo(), mae, [{ tag: "horses", liked: true }]);
    await saveLikes(engineRepo(), sibling, [{ tag: "trucks", liked: true }]);
    const rows = await asRole("student", SEEDED_LEARNER_ID, async (c) => (await c.query("SELECT learner_id::text AS id, interest_tag FROM student_api.my_likes")).rows);
    expect(rows).toEqual([{ id: SEEDED_LEARNER_ID, interest_tag: "horses" }]);
    const xp = await asRole("student", SEEDED_LEARNER_ID, async (c) => (await c.query("SELECT learner_id::text AS id FROM student_api.xp_summary")).rows);
    expect(xp.every((r) => r.id === SEEDED_LEARNER_ID)).toBe(true);
  });

  it("denies the student role identity, config, and admin data", async () => {
    for (const statement of [
      "SELECT * FROM engine.app_user",
      "SELECT * FROM engine.engine_config",
      "SELECT * FROM engine.audit_log",
      "SELECT * FROM admin_api.wrong_answers",
      "DELETE FROM engine.interaction_event",
    ]) {
      await expect(asRole("student", SEEDED_LEARNER_ID, (c) => c.query(statement)), statement).rejects.toThrow(/permission denied/);
    }
  });

  it("writes the audit log through the student role", async () => {
    await writeAudit({ userEmail: "stranger@example.com", role: "outsider", route: "/study", method: "GET", status: 403, detail: "it" });
    expect(listAudit().at(-1)?.detail).toBe("it");
    const stored = await asOwner(async (owner) => (await owner.query("SELECT count(*)::int AS n FROM engine.audit_log WHERE detail = 'it'")).rows[0].n);
    expect(stored).toBe(1);
  });

  it("lets assistant_ro read admin views but not base tables", async () => {
    const rows = await asRole("assistant", null, async (c) => (await c.query("SELECT count(*)::int AS n FROM admin_api.mastery_map")).rows[0].n);
    expect(rows).toBeGreaterThan(0);
    await expect(asRole("assistant", null, (c) => c.query("SELECT * FROM engine.interaction_event"))).rejects.toThrow(/permission denied/);
  });
});
