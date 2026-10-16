import { NextResponse } from "next/server";
import { adminGate } from "@/lib/auth/admin-api";
import { snapshotCounts } from "@/lib/engine/store";

let config = {
  mastery_threshold: 0.9,
  zone_low: 0.7,
  zone_high: 0.95,
  weekly_xp_goal: 600,
  bible_translation: process.env.BIBLE_TRANSLATION || "NABRE",
};

export async function GET(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  return NextResponse.json({ config, counts: snapshotCounts() }, { headers: gate.headers });
}

export async function PUT(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  const body = (await req.json().catch(() => ({}))) as Partial<typeof config>;
  config = { ...config, ...body };
  return NextResponse.json({ config }, { headers: gate.headers });
}

export async function POST(req: Request) {
  return PUT(req);
}

export async function DELETE(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  return NextResponse.json({ error: "forbidden" }, { status: 405, headers: gate.headers });
}
