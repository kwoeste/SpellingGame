import type { SubjectId } from "@/lib/content/types";

const SUBJECT_CONFIG: Record<SubjectId, { emoji: string; bg: string; label: string }> = {
  science: { emoji: "🔬🧪🌿🦎", bg: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)", label: "Science" },
  math: { emoji: "🔢✨📐🧮", bg: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", label: "Math" },
  ela: { emoji: "📚✏️📖🦉", bg: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", label: "Reading" },
  religion: { emoji: "✝️🕊️🌟📿", bg: "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)", label: "Religion" },
};

export function ChapterHeader({ subject, title }: { subject: SubjectId; title: string }) {
  const config = SUBJECT_CONFIG[subject];
  // Split by grapheme so emoji with variation selectors (e.g. ✝️, ✏️, 🕊️) stay whole.
  const emojis = Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(config.emoji), (s) => s.segment);
  return (
    <div className="chapter-header" style={{ background: config.bg }}>
      <div className="chapter-header-art" aria-hidden="true">
        {emojis.map((char, i) => (
          <span key={i} className="chapter-emoji" style={{ animationDelay: `${i * 0.1}s` }}>
            {char}
          </span>
        ))}
      </div>
      <div className="chapter-header-text">
        <span className="chapter-subject-badge">{config.label}</span>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
