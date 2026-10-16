import { NextResponse } from "next/server";
import { adminGate } from "@/lib/auth/admin-api";
import { adminEvents } from "@/lib/engine/store";

export async function GET(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  const rows = adminEvents().filter((event) => event.type === "answer_submitted" && event.isCorrect === false);
  return NextResponse.json({ wrong_answers: rows }, { headers: gate.headers });
}
