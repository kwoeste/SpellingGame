"use client";

import { useEffect, useState } from "react";

type Piece = { id: number; left: number; delay: number; color: string; rot: number };

const COLORS = ["#e85d04", "#ffb703", "#19a37a", "#7c3aed", "#1d7fc4", "#d9486f"];

export function ConfettiBurst({ fire, label = "Celebration" }: { fire: boolean; label?: string }) {
  const [pieces, setPieces] = useState<Piece[]>([]);

  useEffect(() => {
    if (!fire) {
      setPieces([]);
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPieces([{ id: 0, left: 50, delay: 0, color: "#ffb703", rot: 0 }]);
      return;
    }
    setPieces(
      Array.from({ length: 28 }, (_, id) => ({
        id,
        left: (id * 17) % 100,
        delay: (id % 8) * 40,
        color: COLORS[id % COLORS.length],
        rot: (id * 47) % 360,
      })),
    );
    const timer = window.setTimeout(() => setPieces([]), 1800);
    return () => window.clearTimeout(timer);
  }, [fire]);

  if (!pieces.length) return null;
  return (
    <div aria-live="polite" className="sr-only">
      {label}
    </div>
  );
}

export function ConfettiLayer({ fire }: { fire: boolean }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  useEffect(() => {
    if (!fire || typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const next = Array.from({ length: 36 }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 200,
      color: COLORS[id % COLORS.length],
      rot: Math.random() * 360,
    }));
    setPieces(next);
    const timer = window.setTimeout(() => setPieces([]), 1600);
    return () => window.clearTimeout(timer);
  }, [fire]);

  if (!pieces.length) return null;
  return (
    <div aria-hidden="true" style={{ pointerEvents: "none", position: "fixed", inset: 0, zIndex: 50, overflow: "hidden" }}>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          style={{
            position: "absolute",
            top: -12,
            left: `${piece.left}%`,
            width: 10,
            height: 16,
            borderRadius: 3,
            background: piece.color,
            transform: `rotate(${piece.rot}deg)`,
            animation: `kid-fall 1.4s ease-in ${piece.delay}ms forwards`,
          }}
        />
      ))}
      <style>{`@keyframes kid-fall { to { transform: translateY(110vh) rotate(420deg); opacity: 0.2; } }`}</style>
    </div>
  );
}
