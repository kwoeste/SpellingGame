"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ARCADE_GROUPS,
  featuredTile,
  groupArcade,
  type ArcadeGroup,
  type ArcadeTile,
} from "@/lib/games/arcade";

function Stars({ count }: { count: number }) {
  return <div className="stars" aria-label={`${count} of 3 stars`}>{`${"★".repeat(count)}${"☆".repeat(3 - count)}`}</div>;
}

function TileCard({ tile }: { tile: ArcadeTile }) {
  const reduce = useReducedMotion();
  return (
    <motion.div whileHover={reduce ? undefined : { y: -4, scale: 1.02 }} transition={{ type: "spring", stiffness: 380, damping: 22 }}>
    <Link href={tile.href} className={`arcade-tile ${tile.tint}`}>
      {tile.badge ? <span className={`badge ${tile.badge}`}>{tile.badge === "star" ? "Star" : tile.badge === "new" ? "New" : "Play next"}</span> : null}
      <div className="icon" aria-hidden="true">
        {tile.icon}
      </div>
      <h3>{tile.title}</h3>
      <p>{tile.tagline}</p>
      <Stars count={tile.stars} />
      <span className="chip">{tile.groupLabel}</span>
    </Link>
    </motion.div>
  );
}

export function GameArcade({ tiles, resumeHref }: { tiles: ArcadeTile[]; resumeHref?: string | null }) {
  const [filter, setFilter] = useState<ArcadeGroup | "all">("all");
  const visible = useMemo(
    () => (filter === "all" ? tiles : tiles.filter((tile) => tile.group === filter)),
    [filter, tiles],
  );
  const groups = groupArcade(visible);
  const featured = featuredTile(tiles, resumeHref);
  const filterIds = ARCADE_GROUPS.filter((group) => group.id === "all" || tiles.some((tile) => tile.group === group.id));

  return (
    <section aria-labelledby="arcade-heading">
      <p className="kid-kicker">Game arcade</p>
      <h2 id="arcade-heading">Pick a game</h2>
      {featured ? (
        <Link href={featured.href} className="arcade-hero">
          <div className={`icon arcade-tile ${featured.tint}`} style={{ width: 84, height: 84, display: "grid", placeItems: "center", fontSize: "2.4rem", border: 0, boxShadow: "none" }}>
            {featured.icon}
          </div>
          <div>
            <p className="kid-kicker">Play next</p>
            <h3 style={{ margin: 0 }}>{featured.title}</h3>
            <p style={{ margin: "6px 0 0", fontWeight: 700 }}>{featured.tagline}</p>
          </div>
          <span className="btn">Play</span>
        </Link>
      ) : null}
      <div className="arcade-filters" role="group" aria-label="Filter games">
        {filterIds.map((group) => (
          <button key={group.id} type="button" aria-pressed={filter === group.id} onClick={() => setFilter(group.id)}>
            {group.label}
          </button>
        ))}
      </div>
      {groups.map((group) => (
        <div key={group.group} style={{ marginBottom: 22 }}>
          <h3>{group.label}</h3>
          <div className="arcade-grid">
            {group.tiles.map((tile) => (
              <TileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
