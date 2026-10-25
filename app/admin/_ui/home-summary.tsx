import Link from "next/link";
import { formatEtDateTime } from "@/lib/admin/format";
import type { HomeSummary } from "@/lib/admin/load";

export function HomeSummaryView({ data }: { data: HomeSummary }) {
  const planMinutes = data.plan?.reduce((sum, b) => sum + b.minutes, 0) ?? 0;
  return (
    <section className="pd-home-grid" aria-label="Quick look">
      <div className="pd-home-col">
        <article className="pd-card">
          <h2>Today&rsquo;s plan</h2>
          {data.plan && data.plan.length ? (
            <>
              <ul className="pd-plan">
                {data.plan.map((b, i) => (
                  <li key={i}>
                    <span className={`pd-badge ${b.done ? "ok" : ""}`}>{b.done ? "Done" : "To do"}</span> {b.title}{" "}
                    <span className="pd-note">· {b.minutes} min</span>
                  </li>
                ))}
              </ul>
              <p className="pd-note">
                About {planMinutes} min planned{data.planGoalMinutes ? ` · daily goal ${data.planGoalMinutes} min` : ""}.
                {data.planNote ? ` ${data.planNote}` : ""}
              </p>
            </>
          ) : (
            <p className="pd-note">No plan yet today. It&rsquo;s made the first time Mae opens Study.</p>
          )}
        </article>
        <article className="pd-card">
          <h2>How she learns best</h2>
          {data.learnsBest.length ? (
            <ul className="pd-list">
              {data.learnsBest.map((s) => (
                <li key={s.subject} className="pd-list-row"><span>{s.summary}</span></li>
              ))}
            </ul>
          ) : (
            <p className="pd-note">Still learning what works. This fills in after a few re-teaches.</p>
          )}
          <p className="pd-more"><Link href="/admin/learns-best">Details →</Link></p>
        </article>
        <article className="pd-card">
          <h2>Shop inventory</h2>
          {data.inventoryError ? (
            <p className="pd-note">Couldn&rsquo;t load supplies right now.</p>
          ) : data.lowStock.length ? (
            <ul className="pd-list">
              {data.lowStock.map((name) => (
                <li key={name} className="pd-list-row"><span className="pd-badge warn">Running low</span> {name}</li>
              ))}
            </ul>
          ) : (
            <p className="pd-note">Nothing running low.</p>
          )}
          <p className="pd-more"><Link href="/admin/inventory">Shop inventory →</Link></p>
        </article>
      </div>
      <div className="pd-home-col">
        <article className="pd-card">
          <h2>Needs re-teaching</h2>
          {data.needsReteach.length ? (
            <ul className="pd-list">
              {data.needsReteach.map((r) => (
                <li key={r.key} className="pd-list-row">
                  <span>
                    {r.label}
                    {r.count && r.count > 1 ? <span className="pd-note"> · re-taught {r.count} times</span> : null}
                  </span>
                  {r.chapter ? <span className="pd-note">{r.chapter}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="pd-note">Nothing stuck right now.</p>
          )}
          <h2 style={{ marginTop: 12 }}>Latest misses</h2>
          {data.recentMisses.length ? (
            <ul className="pd-list">
              {data.recentMisses.map((m) => (
                <li key={m.id} className="pd-list-row">
                  <span>
                    {m.question}
                    {m.count && m.count > 1 ? <span className="pd-badge warn" style={{ marginLeft: 6 }}>missed {m.count} times total</span> : null}
                  </span>
                  <span className="pd-note">
                    {m.chapter ? `${m.chapter} · ` : ""}
                    {m.count && m.count > 1 ? "last " : ""}
                    {formatEtDateTime(m.at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="pd-note">No missed questions yet.</p>
          )}
          <p className="pd-more"><Link href="/admin/wrong-answers">See all missed questions →</Link></p>
        </article>
      </div>
    </section>
  );
}
