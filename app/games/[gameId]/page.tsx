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
  const isAdmin = user.role === "admin";
  return (
    <div className="kid-shell">
      {isAdmin && spec.pendingReligionReview ? (
        <p className="notice">Admin note: Religion games are hidden from Mae until approved.</p>
      ) : null}
      <NamedGame gameId={game.id} title={game.title} spec={spec} />
    </div>
  );
}
