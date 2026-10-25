import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { HomeSummaryView } from "@/app/admin/_ui/home-summary";

describe("admin home quick look", () => {
  it("renders friendly empty states", () => {
    const html = renderToStaticMarkup(
      createElement(HomeSummaryView, {
        data: { plan: null, planGoalMinutes: null, planNote: null, recentMisses: [], needsReteach: [], learnsBest: [], lowStock: [], inventoryError: false },
      }),
    );
    expect(html).toContain("No plan yet today");
    expect(html).toContain("Nothing running low");
    expect(html).toContain('href="/admin/wrong-answers"');
  });
  it("lists plan, misses and low stock", () => {
    const html = renderToStaticMarkup(
      createElement(HomeSummaryView, {
        data: {
          plan: [{ title: "Christ Our Life Ch 4", minutes: 10, done: true, href: "/study" }],
          planGoalMinutes: 30,
          planNote: null,
          recentMisses: [{ id: "e1", question: "Put the events in order", chapter: "Christ Our Life Ch 4", at: Date.UTC(2026, 9, 24, 18) }],
          needsReteach: [{ key: "k", label: "Order of events" }],
          learnsBest: [],
          lowStock: ["Red PLA filament"],
          inventoryError: false,
        },
      }),
    );
    expect(html).toContain("Done");
    expect(html).toContain("daily goal 30 min");
    expect(html).toContain("Put the events in order");
    expect(html).toContain("Running low");
  });
});
