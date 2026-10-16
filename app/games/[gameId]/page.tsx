import { notFound } from "next/navigation";
import { NamedGame } from "@/components/NamedGame";
import { NAMED_GAMES } from "@/lib/content/catalog";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const game = NAMED_GAMES.find((row) => row.id === gameId);
  if (!game) notFound();
  return (
    <div className="wrap">
      <NamedGame gameId={game.id} title={game.title} />
    </div>
  );
}
