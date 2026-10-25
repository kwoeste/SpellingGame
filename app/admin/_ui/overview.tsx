import type { ReactNode } from "react";
import { PageHeader } from "@/app/admin/_ui/page-header";
import { BarChart, GoalRing, LineChart } from "@/app/admin/_ui/charts";
import { EmptyState } from "@/app/admin/_ui/empty";
import { formatPct } from "@/lib/admin/format";
import { parentTakeaway } from "@/lib/admin/takeaway";
import { ZONE_HIGH, ZONE_LOW, type Overview } from "@/lib/admin/types";

export function OverviewView({ data, summary }: { data: Overview; summary?: ReactNode }) {
  const empty = data.itemsAttempted === 0 && data.xpTotal === 0;
  return (
    <div className="pd-wrap">
      <PageHeader
        kicker="Today"
        title={`${data.learnerNickname}’s day`}
        lead={`A quick look at today and this week. Mae never sees this page. Updated ${data.asOfEt}.`}
      />
      {empty ? null : (
        <p className="pd-takeaway" role="status">
          <strong>In short:</strong>{" "}
          {parentTakeaway({
            firstTryAccuracy: data.firstTryAccuracy,
            engagedMinutesToday: data.engagedMinutesToday,
            dailyMinutesGoal: data.rings.find((r) => r.id === "minutes")?.goal ?? 0,
          })}
        </p>
      )}
      {summary}
      <h2 className="pd-section">This week</h2>
      {empty ? (
        <EmptyState
          title="No sessions yet"
          body="When Mae plays Study or a game, this page will show minutes, XP, first-try accuracy, goal rings, and alerts for gaps, reviews, rusty skills, and rushing."
        />
      ) : null}
      <div className="pd-grid pd-metrics">
        <div className="pd-metric">
          <span className="pd-label">Minutes today</span>
          <span className="pd-value">{data.engagedMinutesToday}</span>
          <span className="pd-note">{data.engagedMinutesWeek} min this week</span>
        </div>
        <div className="pd-metric">
          <span className="pd-label">Points (XP) today</span>
          <span className="pd-value">{data.xpToday}</span>
          <span className="pd-note">
            {data.xpWeek} this week · {data.xpTotal} total
          </span>
        </div>
        <div className="pd-metric">
          <span className="pd-label">Questions finished</span>
          <span className="pd-value">{data.itemsCompleted}</span>
          <span className="pd-note">{data.itemsAttempted} attempted</span>
        </div>
        <div className={`pd-metric ${data.inTargetBand === false ? "out-band" : data.inTargetBand ? "in-band" : ""}`}>
          <span className="pd-label">Right on first try</span>
          <span className="pd-value">{formatPct(data.firstTryAccuracy)}</span>
          <span className="pd-note">
            Healthy range {Math.round(ZONE_LOW * 100)}–{Math.round(ZONE_HIGH * 100)}%
            {data.inTargetBand === true ? " · just right" : data.inTargetBand === false ? " · outside range" : ""}
          </span>
        </div>
        <div className="pd-metric">
          <span className="pd-label">Streak</span>
          <span className="pd-value">{data.streakDays}</span>
          <span className="pd-note">days in a row</span>
        </div>
      </div>
      <div className="pd-grid pd-split" style={{ marginTop: 14 }}>
        <section className="pd-card">
          <h2>Goal rings</h2>
          <div className="pd-rings">
            {data.rings.map((ring) => (
              <GoalRing key={ring.id} {...ring} />
            ))}
          </div>
        </section>
        <section className="pd-card">
          <h2>Alerts</h2>
          {data.alerts.length === 0 ? (
            <EmptyState title="All quiet" body="No holes, overdue reviews, rusty skills, or rushing bursts right now." />
          ) : (
            <div className="pd-alert">
              {data.alerts.map((alert) => (
                <div key={`${alert.kind}:${alert.targetId ?? alert.title}`} className="pd-alert-item" data-kind={alert.kind}>
                  <strong>{alert.title}</strong>
                  <span>{alert.detail}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="pd-card" style={{ marginTop: 14 }} aria-label="Rush meter">
        <h2>Rush meter</h2>
        {data.rushMeter.level === "none" ? (
          <EmptyState title="No answers this week" body="Shows how often answers are fast wrong guesses (under 1.5 s)." />
        ) : (
          <div>
            <p style={{ margin: "0 0 8px" }}>
              <span className={`pd-pill ${data.rushMeter.level === "calm" ? "" : "rush"}`}>
                {data.rushMeter.level === "calm" ? "Calm" : data.rushMeter.level === "watch" ? "Watch" : "Rushing"}
              </span>{" "}
              {Math.round((data.rushMeter.rate7d ?? 0) * 100)}% of the last 7 days&apos; answers were rapid guesses ({data.rushMeter.rushed7d} of{" "}
              {data.rushMeter.answers7d}); {data.rushMeter.rushedToday} today. Two rapid misses in three answers shows her a slow-down nudge.
            </p>
            <div role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((data.rushMeter.rate7d ?? 0) * 100)} style={{ height: 12, borderRadius: 6, background: "#eee", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, Math.round((data.rushMeter.rate7d ?? 0) * 100 * 2.5))}%`, height: "100%", background: data.rushMeter.level === "calm" ? "#2bb673" : data.rushMeter.level === "watch" ? "#f0a500" : "#d64545" }} />
            </div>
            <p className="pd-note" style={{ marginTop: 6 }}>Scale: 0–40%. Watch at 10%, rushing at 20%.</p>
          </div>
        )}
      </section>
      <div className="pd-grid pd-two" style={{ marginTop: 14 }}>
        <section className="pd-card">
          <h2>Minutes per day</h2>
          {data.daily.length === 0 ? (
            <EmptyState title="No time logged" body="XP minutes will plot here after the first engaged minute." />
          ) : (
            <BarChart
              title="Engaged minutes by day"
              points={data.daily.map((day) => ({ x: day.day, y: day.minutes }))}
              caption="Minutes she was actually working each day (ET)."
            />
          )}
        </section>
        <section className="pd-card">
          <h2>Right on first try, by week</h2>
          {data.weeklyAccuracy.length === 0 ? (
            <EmptyState title="No scored items" body="Weekly first-try accuracy will appear after she answers questions." />
          ) : (
            <LineChart
              title="Weekly first-try accuracy"
              points={data.weeklyAccuracy.map((week) => ({ x: week.week, y: week.accuracy }))}
              xPrefix="Week of "
              yMin={0}
              yMax={1}
              band={{ low: ZONE_LOW, high: ZONE_HIGH }}
              caption="Shaded area is the healthy 70–95% range: hard enough to learn, easy enough to stay confident."
            />
          )}
        </section>
      </div>
    </div>
  );
}
