import { NextResponse } from "next/server";
import { adminGate } from "@/lib/auth/admin-api";
import { validUpcoming, type UpcomingTest } from "@/lib/practice/upcoming";
import { deleteUpcomingTest, loadUpcomingTests, saveUpcomingTest } from "@/lib/practice/upcoming-store";

export async function GET(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  return NextResponse.json({ tests: await loadUpcomingTests("admin") }, { headers: gate.headers });
}

/** Create or update one dated item (spelling list, practice test, chapter test). */
export async function PUT(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  const body = (await req.json().catch(() => null)) as Partial<UpcomingTest> | null;
  const t = body ? { id: body.id, kind: body.kind, refId: body.refId, title: body.title?.trim(), startDate: body.startDate, testDate: body.testDate } : {};
  if (!validUpcoming(t)) return NextResponse.json({ error: "invalid" }, { status: 400, headers: gate.headers });
  try {
    await saveUpcomingTest(t, gate.actor.email);
    return NextResponse.json({ ok: true, tests: await loadUpcomingTests("admin") }, { headers: gate.headers });
  } catch (error) {
    console.error("upcoming save failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: gate.headers });
  }
}

export async function DELETE(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id.length > 80) return NextResponse.json({ error: "invalid" }, { status: 400, headers: gate.headers });
  try {
    await deleteUpcomingTest(id);
    return NextResponse.json({ ok: true }, { headers: gate.headers });
  } catch (error) {
    console.error("upcoming delete failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: gate.headers });
  }
}
