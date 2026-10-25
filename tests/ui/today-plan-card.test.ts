import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TodayPlanCard } from "@/components/TodayPlanCard";

const plan = {
  blocks: [{ id: "game:x", kind: "game", title: "Game time", href: "/games", minutes: 5, done: false }],
  goalMinutes: 15,
  minutesToday: 44,
  timeBack: true,
  whyKid: "Chapter first, then a game as your reward.",
};

describe("TodayPlanCard", () => {
  it("shows the why-today line even after Time back", () => {
    const html = renderToStaticMarkup(createElement(TodayPlanCard, { plan }));
    expect(html).toContain("Time back!");
    expect(html).toContain("Chapter first, then a game as your reward.");
  });
  it("shows the why line before the goal is met", () => {
    const html = renderToStaticMarkup(createElement(TodayPlanCard, { plan: { ...plan, timeBack: false, minutesToday: 3 } }));
    expect(html).not.toContain("Time back!");
    expect(html).toContain("Chapter first");
  });
});
