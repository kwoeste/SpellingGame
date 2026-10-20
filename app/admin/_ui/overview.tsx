import { BarChart, GoalRing, LineChart } from "@/app/admin/_ui/charts";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatPct } from "@/lib/admin/format";
import { ZONE_HIGH, ZONE_LOW, type Overview } from "@/lib/admin/types";

export function OverviewView({ data }: { data: Overview }) {
  const empty = data.itemsAttempted === 0 && data.xpTotal === 0;
  return (
    <div className="ad-wrap">
      <p className="ad-kicker">Parent dashboard · admin only</p>
      <h1>{data.learnerNickname}&rsquo;s week</h1>
      <p className="ad-lead">
        Time, XP, accuracy against the 70–95% target band, streak, and alerts. Mae never sees these
        numbers. As of {data.asOfEt}.
      </p>
      {empty ? (
        <EmptyState
          title="No sessions yet"
          body="When Mae plays Study or a game, this page will show minutes, XP, first-try accuracy, goal rings, and alerts for gaps, reviews, rusty skills, and rushing."
        />
      ) : null}
      <div className="ad-grid ad-metrics">
        <div className="ad-metric">
          <span className="ad-label">Time on task today</span>
          <span className="ad-value">{data.engagedMinutesToday}</span>
          <span className="ad-note">{data.engagedMinutesWeek} min this week</span>
        </div>
        <div className="ad-metric">
          <span className="ad-label">XP</span>
          <span className="ad-value">{data.xpToday}</span>
          <span className="ad-note">
            {data.xpWeek} this week · {data.xpTotal} total
          </span>
        </div>
        <div className="ad-metric">
          <span className="ad-label">Items completed</span>
          <span className="ad-value">{data.itemsCompleted}</span>
          <span className="ad-note">{data.itemsAttempted} attempted</span>
        </div>
        <div className={`ad-metric ${data.inTargetBand === false ? "out-band" : data.inTargetBand ? "in-band" : ""}`}>
          <span className="ad-label">First-try accuracy</span>
          <span className="ad-value">{formatPct(data.firstTryAccuracy)}</span>
          <span className="ad-note">
            Target band {Math.round(ZONE_LOW * 100)}–{Math.round(ZONE_HIGH * 100)}%
            {data.inTargetBand === true ? " · in band" : data.inTargetBand === false ? " · outside band" : ""}
          </span>
        </div>
        <div className="ad-metric">
          <span className="ad-label">Streak</span>
          <span className="ad-value">{data.streakDays}</span>
          <span className="ad-note">days with engaged minutes</span>
        </div>
      </div>
      <div className="ad-grid ad-split" style={{ marginTop: 14 }}>
        <section className="ad-card">
          <h2>Goal rings</h2>
          <div className="ad-rings">
            {data.rings.map((ring) => (
              <GoalRing key={ring.id} {...ring} />
            ))}
          </div>
        </section>
        <section className="ad-card">
          <h2>Alerts</h2>
          {data.alerts.length === 0 ? (
            <EmptyState title="All quiet" body="No holes, overdue reviews, rusty skills, or rushing bursts right now." />
          ) : (
            <div className="ad-alert">
              {data.alerts.map((alert) => (
                <div key={`${alert.kind}:${alert.targetId ?? alert.title}`} className="ad-alert-item" data-kind={alert.kind}>
                  <strong>{alert.title}</strong>
                  <span>{alert.detail}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="ad-grid ad-two" style={{ marginTop: 14 }}>
        <section className="ad-card">
          <h2>Engaged minutes</h2>
          {data.daily.length === 0 ? (
            <EmptyState title="No time logged" body="XP minutes will plot here after the first engaged minute." />
          ) : (
            <BarChart
              title="Engaged minutes by day"
              points={data.daily.map((day) => ({ x: day.day, y: day.minutes }))}
              caption="Source: XP ledger · America/New_York days · 10 XP per engaged minute"
            />
          )}
        </section>
        <section className="ad-card">
          <h2>Accuracy vs 70–95% band</h2>
          {data.weeklyAccuracy.length === 0 ? (
            <EmptyState title="No scored items" body="Weekly first-try accuracy will appear after she answers questions." />
          ) : (
            <LineChart
              title="Weekly first-try accuracy"
              points={data.weeklyAccuracy.map((week) => ({ x: week.week, y: week.accuracy }))}
              yMin={0}
              yMax={1}
              band={{ low: ZONE_LOW, high: ZONE_HIGH }}
              caption="Shaded band is the 70–95% target zone. Set point is about 82%."
            />
          )}
        </section>
      </div>
    </div>
  );
}
