import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NamedGame } from "@/components/NamedGame";
import { NotAllowed } from "@/components/NotAllowed";
import { requirePageUser } from "@/lib/auth/server";
import { NAMED_GAMES } from "@/lib/content/catalog";
import { gameSpec, gameVisibleTo, isGameId } from "@/lib/content/games";

export async function generateMetadata({ params }: { params: Promise<{ gameId: string }> }): Promise<Metadata> {
  const { gameId } = await params;
  const game = NAMED_GAMES.find((row) => row.id === gameId);
  if (!game) return { title: "Game Lab | Mae's Lab" };
  return { title: `${game.title} | Mae's Lab` };
}

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const user = await requirePageUser(["student", "admin"], `/games/${gameId}`);
  if (!user) return <NotAllowed />;
  const game = NAMED_GAMES.find((row) => row.id === gameId);
  if (!game || !isGameId(game.id) || !gameVisibleTo(game.id, user.role)) notFound();
  const spec = gameSpec(game.id);
  return (
    <div className="kid-shell">
      {spec.pendingReligionReview ? <p className="notice">Religion game pending review; hidden from Mae.</p> : null}
      <NamedGame gameId={game.id} title={game.title} spec={spec} />
    </div>
  );
}
