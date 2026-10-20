"use client";

import { useEffect, useState } from "react";
import { INTEREST_CARDS } from "@/lib/ui/interests";
import { playSound } from "@/lib/ui/sounds";
import { useKidPrefs } from "@/components/ui/KidPrefs";

export function LikesPicker({
  initialLiked = [],
  heading = "What do you like?",
}: {
  initialLiked?: string[];
  heading?: string;
}) {
  const { soundOn } = useKidPrefs();
  const [likes, setLikes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialLiked.map((tag) => [tag, true])),
  );
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/engine/likes")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { likes?: { interestTag: string; liked: boolean }[] } | null) => {
        if (cancelled || !json?.likes?.length) return;
        setLikes(Object.fromEntries(json.likes.map((row) => [row.interestTag, row.liked])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    const tags = INTEREST_CARDS.map((card) => ({ tag: card.tag, liked: Boolean(likes[card.tag]) }));
    const res = await fetch("/api/engine/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    setSaved(res.ok ? "Saved your likes. Lessons will use these." : "Sign in to save likes.");
  }

  return (
    <section className="card" aria-labelledby="likes-heading">
      <p className="kid-kicker">Your world</p>
      <h2 id="likes-heading">{heading}</h2>
      <p>Tap the cards that feel like you. Facts stay true — we just pick friendlier examples.</p>
      <div className="interest-grid">
        {INTEREST_CARDS.map((card) => {
          const selected = Boolean(likes[card.tag]);
          return (
            <button
              key={card.tag}
              type="button"
              className={`interest-card ${card.tint} ${selected ? "selected" : ""}`}
              aria-pressed={selected}
              onClick={() => {
                playSound("tap", soundOn);
                setLikes((prev) => ({ ...prev, [card.tag]: !prev[card.tag] }));
              }}
            >
              <div className="icon" aria-hidden="true">
                {card.icon}
              </div>
              <strong>{card.label}</strong>
              <p>{card.blurb}</p>
            </button>
          );
        })}
      </div>
      <button className="btn" onClick={save} style={{ marginTop: 14 }}>
        Save likes
      </button>
      {saved ? <p role="status">{saved}</p> : null}
    </section>
  );
}
