type Mood = "idle" | "cheer" | "think";

const TITLE: Record<Mood, string> = {
  idle: "Pip the gecko",
  cheer: "Pip cheering",
  think: "Pip thinking",
};

export function Mascot({ mood = "idle", size = 88 }: { mood?: Mood; size?: number }) {
  const smile = mood === "cheer" ? "M28 40 q12 10 24 0" : mood === "think" ? "M32 42 q8 4 16 0" : "M30 41 q10 7 20 0";
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={TITLE[mood]}>
      <title>{TITLE[mood]}</title>
      <circle cx="40" cy="40" r="38" fill="#7ed9c7" />
      <circle cx="40" cy="42" r="28" fill="#b8f0de" />
      <ellipse cx="28" cy="22" rx="10" ry="12" fill="#19a37a" />
      <ellipse cx="52" cy="22" rx="10" ry="12" fill="#19a37a" />
      <circle cx="28" cy="20" r="4.5" fill="#1b2437" />
      <circle cx="52" cy="20" r="4.5" fill="#1b2437" />
      <circle cx="29.5" cy="18.5" r="1.4" fill="white" />
      <circle cx="53.5" cy="18.5" r="1.4" fill="white" />
      <path d={smile} fill="none" stroke="#1b2437" strokeWidth="3" strokeLinecap="round" />
      {mood === "cheer" ? <path d="M18 34 q-8 8 0 14" fill="none" stroke="#e85d04" strokeWidth="3" /> : null}
      {mood === "think" ? <circle cx="64" cy="14" r="4" fill="#ffe08a" /> : null}
      <path d="M14 58 q10 10 26 6" fill="none" stroke="#0d7a5a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
