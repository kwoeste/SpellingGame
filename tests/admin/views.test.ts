import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverviewView } from "@/app/admin/_ui/overview";
import { ProgressViewPanel } from "@/app/admin/_ui/progress";
import { SessionTimeline } from "@/app/admin/_ui/sessions";
import { buildOverview, buildProgress, buildSessions, buildWrongAnswers } from "@/lib/admin/dashboard";
import { demoSnapshot } from "@/lib/admin/demo-fixture";

describe("admin presentational views", () => {
  it("renders empty overview copy when there is no play", () => {
    const html = renderToStaticMarkup(
      createElement(OverviewView, {
        data: buildOverview({
          ...demoSnapshot(),
          events: [],
          xp: [],
          mastery: [],
          sessions: [],
          reviews: [],
        }),
      }),
    );
    expect(html).toContain("No sessions yet");
    expect(html).toContain("70");
    expect(html).toContain("95");
  });

  it("renders demo overview, progress, and session timeline", () => {
    const snap = demoSnapshot();
    const overview = renderToStaticMarkup(createElement(OverviewView, { data: buildOverview(snap) }));
    expect(overview).toContain("Minutes today");
    expect(overview).toContain("Gap:");
    const progress = renderToStaticMarkup(createElement(ProgressViewPanel, { data: buildProgress(snap) }));
    expect(progress).toContain("Math");
    expect(progress).toContain("Science");
    const sessions = renderToStaticMarkup(createElement(SessionTimeline, { data: buildSessions(snap) }));
    expect(sessions).toContain("min working");
    expect(sessions).toMatch(/Good pace|Read too fast|Skipped ahead|Rushing/);
    const wrong = buildWrongAnswers(snap);
    expect(wrong.rows[0]?.itemText).toContain("observation");
    expect(wrong.rows[0]?.responseText).toContain("tool");
  });
});
