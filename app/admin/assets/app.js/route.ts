export function GET() {
  return new Response("/* admin dashboard helpers */\nwindow.__MAE_ADMIN__ = true;\n", {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
