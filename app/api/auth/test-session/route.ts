import { NextResponse } from "next/server";
import { mintTestSession } from "@/lib/auth/sessions";
import { noStoreHeaders } from "@/lib/auth/guards";

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "test") {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStoreHeaders() });
  }
  const body = (await req.json().catch(() => ({}))) as { email?: string };
  if (!body.email) {
    return NextResponse.json({ error: "email required" }, { status: 400, headers: noStoreHeaders() });
  }
  try {
    const session = mintTestSession(body.email);
    const res = NextResponse.json({ ok: true, sessionId: session.id }, { headers: noStoreHeaders() });
    res.cookies.set("mae_session", session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStoreHeaders() });
  }
}
