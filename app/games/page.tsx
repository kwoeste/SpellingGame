import { NotAllowed } from "@/components/NotAllowed";
import { GameArcade } from "@/components/GameArcade";
import { requirePageUser } from "@/lib/auth/server";
import { arcadeTiles } from "@/lib/games/arcade";

export default async function GamesPage() {
  const user = await requirePageUser(["student", "admin"], "/games");
  if (!user) return <NotAllowed />;
  return (
    <div className="kid-shell">
      <GameArcade tiles={arcadeTiles({ role: user.role, badges: [], recommendedSpellingId: "d1" })} />
    </div>
  );
}
