import Link from "next/link";
import { NAMED_GAMES } from "@/lib/content/catalog";

export default function GamesPage() {
  return (
    <div className="wrap">
      <h1>Mae&apos;s Game Lab</h1>
      <p>Sign-in required. Shop stays public.</p>
      <div className="grid cols-2">
        <Link className="card" href="/spelling-game">
          <h2>Spelling Safari</h2>
          <p>Listen and tap the letters.</p>
        </Link>
        <Link className="card" href="/number-match">
          <h2>Number Match</h2>
          <p>The count game. First to 3, 5, or 10.</p>
        </Link>
        {NAMED_GAMES.map((game) => (
          <Link key={game.id} className="card" href={`/games/${game.id}`}>
            <h2>{game.title}</h2>
            <p>Playable on the shared engine.</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
