import { NextResponse } from "next/server";
import { z } from "zod";
import { adminGate } from "@/lib/auth/admin-api";
import { bibleTranslation } from "@/lib/content/build";
import { adminRepo } from "@/lib/engine/repos";

const DEFAULT_CONFIG = {
  mastery_threshold: 0.9,
  zone_low: 0.7,
  zone_high: 0.95,
  weekly_xp_goal: 600,
};

/** Only known keys; the 90% mastery bar is a floor, not a dial. */
const ConfigPatch = z
  .object({
    mastery_threshold: z.number().min(0.9).max(1),
    zone_low: z.number().min(0.5).max(0.9),
    zone_high: z.number().min(0.8).max(1),
    weekly_xp_goal: z.number().int().min(60).max(3000),
  })
  .partial()
  .strict();

async function currentConfig() {
  const stored = ConfigPatch.safeParse((await adminRepo().activeConfig()) ?? {});
  return { ...DEFAULT_CONFIG, ...(stored.success ? stored.data : {}) };
}

export async function GET(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json(
      { config: await currentConfig(), bible_translation: bibleTranslation(), counts: await adminRepo().counts() },
      { headers: gate.headers },
    );
  } catch (error) {
    console.error("config read failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: gate.headers });
  }
}

export async function PUT(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  const parsed = ConfigPatch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_config", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400, headers: gate.headers });
  }
  try {
    const next = { ...(await currentConfig()), ...parsed.data };
    if (next.zone_low >= next.zone_high) {
      return NextResponse.json({ error: "invalid_config", issues: ["zone_low"] }, { status: 400, headers: gate.headers });
    }
    const version = await adminRepo().saveConfig(next, gate.actor.email);
    return NextResponse.json({ config: next, version }, { headers: gate.headers });
  } catch (error) {
    console.error("config save failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: gate.headers });
  }
}
