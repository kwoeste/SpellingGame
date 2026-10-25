import type { ResolvedAnswer } from "@/lib/admin/answer-text";

/** Shows a resolved answer: a numbered list for sequences, wrong parts marked with ✗. */
export function AnswerList({ answer, showMarks = false }: { answer: ResolvedAnswer; showMarks?: boolean }) {
  if (answer.lines.length === 1 && !answer.ordered) {
    const line = answer.lines[0]!;
    return <span className={showMarks && line.wrong ? "pd-ans-wrong" : undefined}>{line.text}</span>;
  }
  const Tag = answer.ordered ? "ol" : "ul";
  return (
    <Tag className="pd-ans-list">
      {answer.lines.map((line, idx) => (
        <li key={idx} className={showMarks && line.wrong ? "pd-ans-wrong" : undefined}>
          {line.text}
          {showMarks && line.wrong ? <span className="pd-sr"> (wrong)</span> : null}
        </li>
      ))}
    </Tag>
  );
}
