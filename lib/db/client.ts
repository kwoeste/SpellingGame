import { neon, Pool } from "@neondatabase/serverless";

export type DbRole = "student" | "admin" | "assistant";

export type QueryResult<R> = { rows: R[]; rowCount?: number | null };

export type DbClient = {
  query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<R>>;
  release(): void;
};

export type DbPool = {
  connect(): Promise<DbClient>;
  end(): Promise<void>;
};

const ROLE_ENV: Record<DbRole, string> = {
  student: "DATABASE_URL_STUDENT",
  admin: "DATABASE_URL_ADMIN",
  assistant: "DATABASE_URL_ASSISTANT",
};

let warnedFallback = false;

/**
 * Role-scoped connection string. Falls back to DATABASE_URL (the Neon owner, which bypasses RLS)
 * outside Vercel production so previews persist as soon as the Neon integration sets DATABASE_URL.
 * Production refuses the fallback: role URLs are required there.
 */
export function databaseUrlFor(role: DbRole): string | null {
  const scoped = process.env[ROLE_ENV[role]];
  if (scoped) return scoped;
  const owner = process.env.DATABASE_URL;
  if (!owner) return null;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(`${ROLE_ENV[role]} must be set in production; refusing to use the owner DATABASE_URL at runtime.`);
  }
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn(`${ROLE_ENV[role]} is not set; using DATABASE_URL. Row-level security is not enforced for this connection.`);
  }
  return owner;
}

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL || process.env.DATABASE_URL_STUDENT);
}

let poolFactoryOverride: ((role: DbRole) => DbPool) | null = null;

/** Tests inject a node-postgres pool factory; production uses Neon's WebSocket Pool. */
export function setPoolFactoryForTests(factory: ((role: DbRole) => DbPool) | null): void {
  poolFactoryOverride = factory;
}

export function poolOverrideActive(): boolean {
  return poolFactoryOverride !== null;
}

function createPool(role: DbRole): DbPool {
  if (poolFactoryOverride) return poolFactoryOverride(role);
  const url = databaseUrlFor(role);
  if (!url) throw new Error(`No database configured for ${role}.`);
  return new Pool({ connectionString: url }) as unknown as DbPool;
}

/**
 * Runs `work` in one transaction. For the student role, `app.learner_id` is set transaction-locally
 * so RLS policies scope every statement to that learner.
 */
export async function withTransaction<T>(
  role: DbRole,
  learnerId: string | null,
  work: (client: DbClient) => Promise<T>,
): Promise<T> {
  const pool = createPool(role);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (learnerId) {
      await client.query("select set_config('app.learner_id', $1, true)", [learnerId]);
    }
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

/** One-shot statement over Neon's HTTP driver; safe to call from Edge middleware. */
export async function queryOnce<R = Record<string, unknown>>(
  role: DbRole,
  text: string,
  params: unknown[] = [],
): Promise<R[]> {
  if (poolFactoryOverride) {
    return withTransaction(role, null, async (client) => (await client.query<R>(text, params)).rows);
  }
  const url = databaseUrlFor(role);
  if (!url) throw new Error(`No database configured for ${role}.`);
  const sql = neon(url);
  return (await sql.query(text, params)) as R[];
}
