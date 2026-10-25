import { NextResponse } from "next/server";
import { SEEDED_LEARNER_ID } from "@/lib/auth/users";
import { adminRepo } from "@/lib/engine/repos";
import { generateInsight } from "@/lib/engine/learning-insight";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Weekly Vercel cron. Fails closed: requires `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const result = await generateInsight(adminRepo(), SEEDED_LEARNER_ID, "weekly", null);
    return NextResponse.json({ status: result.status, source: result.insight?.source ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("weekly insight failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
