import { adminGate } from "@/lib/auth/admin-api";

export async function GET(req: Request) {
  const gate = await adminGate(req);
  if (!gate.ok) return gate.response;
  return new Response("/* admin dashboard helpers */\nwindow.__MAE_ADMIN__ = true;\n", {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
