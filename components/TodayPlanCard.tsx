import Link from "next/link";

export type TodayPlanView = {
  blocks: { id: string; kind: string; title: string; href: string; minutes: number; done: boolean; detail?: string }[];
  goalMinutes: number;
  minutesToday: number;
  timeBack: boolean;
  whyKid: string;
};

const ICON: Record<string, string> = { reteach: "↻", warmup: "🔥", assignment: "⭐", chapter: "📖", game: "🎮", spelling: "✏️", test: "📅" };

function MinutesRing({ done, goal }: { done: number; goal: number }) {
  const pct = goal > 0 ? Math.min(1, done / goal) : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`${Math.min(done, goal)} of ${goal} minutes`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e8e2f5" strokeWidth="10" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke={pct >= 1 ? "#2bb673" : "#7b5cd6"}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 44 44)"
      />
      <text x="44" y="42" textAnchor="middle" fontSize="18" fontWeight="700">{Math.min(done, goal)}</text>
      <text x="44" y="58" textAnchor="middle" fontSize="10">of {goal} min</text>
    </svg>
  );
}

/** Today's plan: a short ordered list, a minutes ring, and "Time back!" once the goal is met. */
export function TodayPlanCard({ plan }: { plan: TodayPlanView }) {
  const next = plan.blocks.find((b) => !b.done);
  return (
    <section className="today-plan kid-card" aria-label="Today's plan">
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <MinutesRing done={plan.minutesToday} goal={plan.goalMinutes} />
        <div>
          <p className="kid-kicker" style={{ margin: 0 }}>Today&apos;s plan</p>
          {plan.timeBack ? (
            <p className="time-back" style={{ fontWeight: 800, fontSize: "1.3rem", margin: "4px 0" }}>Time back! 🎉 You&apos;re done for today.</p>
          ) : null}
          {plan.whyKid ? (
            <p className="plan-why" style={{ margin: "4px 0" }}>{plan.whyKid}</p>
          ) : null}
        </div>
      </div>
      <ol className="today-plan-list" style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 8 }}>
        {plan.blocks.map((b) => (
          <li key={b.id}>
            <Link href={b.href} className={`continue-card${b.done ? " plan-done" : ""}${next?.id === b.id ? " plan-next" : ""}`} style={b.done ? { opacity: 0.6 } : undefined}>
              <span className="continue-icon" aria-hidden>{b.done ? "✅" : ICON[b.kind] ?? "▶"}</span>
              <span className="continue-text">
                <strong>{b.title}</strong>
                <span>{b.done ? "Done!" : `about ${b.minutes} min`}{b.detail ? ` · ${b.detail}` : ""}</span>
              </span>
              <span className="continue-arrow">→</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
