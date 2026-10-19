"use client";

import { useState } from "react";

const TAGS = [
  { tag: "animals.reptiles", label: "Reptiles" },
  { tag: "animals.snakes", label: "Snakes" },
  { tag: "crafts.fidgets", label: "Fidgets" },
  { tag: "crafts.3d_printing", label: "3D printing" },
  { tag: "crafts.selling", label: "Shop / selling" },
  { tag: "sports.soccer", label: "Soccer" },
];

export function LikesPicker() {
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState("");

  async function save() {
    const tags = Object.entries(likes).map(([tag, liked]) => ({ tag, liked }));
    const res = await fetch("/api/engine/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    setSaved(res.ok ? "Saved your likes." : "Sign in to save likes.");
  }

  return (
    <div className="card">
      <h2>What do you like?</h2>
      <div className="chips">
        {TAGS.map((row) => (
          <button
            key={row.tag}
            className={`option ${likes[row.tag] ? "selected" : ""}`}
            onClick={() => setLikes((prev) => ({ ...prev, [row.tag]: !prev[row.tag] }))}
          >
            {row.label}
          </button>
        ))}
      </div>
      <button className="btn" onClick={save} style={{ marginTop: 12 }}>
        Save likes
      </button>
      {saved ? <p>{saved}</p> : null}
    </div>
  );
}
