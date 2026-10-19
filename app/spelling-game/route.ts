import { serveLegacyGame } from "@/lib/games/legacy";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  return serveLegacyGame(req, "spelling-game.html");
}
