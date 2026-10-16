import { neon } from "@neondatabase/serverless";

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function sqlFor(role: "default" | "student" | "admin" | "assistant") {
  const url =
    role === "student"
      ? process.env.DATABASE_URL_STUDENT
      : role === "admin"
        ? process.env.DATABASE_URL_ADMIN
        : role === "assistant"
          ? process.env.DATABASE_URL_ASSISTANT
          : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(`Missing connection string for ${role}. Set the matching DATABASE_URL* env var.`);
  }
  return neon(url);
}

export async function withLearner<T>(learnerId: string, work: (sql: ReturnType<typeof sqlFor>) => Promise<T>): Promise<T> {
  const sql = sqlFor("student");
  await sql`select set_config('app.learner_id', ${learnerId}, true)`;
  return work(sql);
}
