import { NextResponse } from "next/server";
import { adminGate } from "@/lib/auth/admin-api";
import { adminEvents } from "@/lib/engine/store";

export async function GET(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  return NextResponse.json({ event_count: adminEvents().length }, { headers: gate.headers });
}
