import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, beforeEach } from "vitest";
import { GameArcade } from "@/components/GameArcade";
import { pairWord } from "@/components/ChapterPlayer";
import { SiteHeaderView } from "@/components/SiteHeader";
import { featuredTile } from "@/lib/games/arcade";
import { arcadeTiles } from "@/lib/games/arcade-tiles";
import { allWordsRevealed, answerUnlockMs, flattenPassage } from "@/lib/ui/careful-read";
import { INTEREST_CARDS } from "@/lib/ui/interests";
import { SPELLING_LISTS } from "@/lib/games/spelling-lists";
import { storageKey } from "@/lib/games/spelling-progress";
import { headerNav } from "@/lib/nav";
import { clampRate, pickVoice, rankVoices, voiceScore } from "@/lib/ui/voice";

describe("careful reading helpers", () => {
  it("splits words and knows when every word was tapped", () => {
    const words = flattenPassage([{ text: "Ice feels cold." }, { text: "The sun can melt it." }]);
    expect(words.map((word) => word.text)).toEqual(["Ice", "feels", "cold.", "The", "sun", "can", "melt", "it."]);
    expect(allWordsRevealed(words.length, [0, 1, 2])).toBe(false);
    expect(allWordsRevealed(words.length, words.map((_, i) => i))).toBe(true);
    expect(answerUnlockMs(3)).toBeGreaterThanOrEqual(4000);
    expect(answerUnlockMs(80)).toBe(5000);
  });
});

describe("spelling progress storage", () => {
  it("generates unique storage keys per list", () => {
    expect(storageKey("d1")).toBe("spelling-safari:d1");
    expect(storageKey("wk6-2")).toBe("spelling-safari:wk6-2");
    expect(storageKey("d1")).not.toBe(storageKey("wk6-2"));
  });
});

describe("matching cards", () => {
  it("pairs a word to a meaning and lets you unpair", () => {
    const once = pairWord({}, "observation", "something you notice");
    expect(once).toEqual({ observation: "something you notice" });
    const stolen = pairWord(once, "data", "something you notice");
    expect(stolen).toEqual({ data: "something you notice" });
    expect(pairWord(stolen, "data", "something you notice")).toEqual({});
  });
});

describe("voice picker helpers", () => {
  it("ranks English voices and clamps speed", () => {
    const voices = rankVoices([
      { name: "Bad", lang: "fr-FR" },
      { name: "Google US English", lang: "en-US" },
      { name: "Moira", lang: "en-IE" },
    ]);
    expect(voices[0]?.name).toBe("Google US English");
    expect(voiceScore({ name: "Neural", lang: "en-US" })).toBeGreaterThan(voiceScore({ name: "Basic", lang: "en-GB" }));
    expect(pickVoice(voices, "Moira")?.name).toBe("Moira");
    expect(clampRate(9)).toBe(1.2);
    expect(clampRate(Number.NaN)).toBe(0.85);
  });
});

describe("arcade and header chrome", () => {
  it("builds illustrated tiles for every restored spelling list plus Number Match", () => {
    const tiles = arcadeTiles({ role: "student", badges: [] });
    for (const list of SPELLING_LISTS) {
      const expectedTitle = `Spelling Safari · ${list.shortTitle}`;
      expect(tiles.some((tile) => tile.title === expectedTitle)).toBe(true);
    }
    expect(tiles.some((tile) => tile.href === "/number-match")).toBe(true);
    expect(tiles.every((tile) => tile.group !== "religion")).toBe(true);
    expect(featuredTile(tiles).badge === "recommended" || featuredTile(tiles).id.startsWith("spelling")).toBe(true);
  });

  it("renders arcade tiles as links, not underlined pills", () => {
    const tiles = arcadeTiles({ role: "admin", badges: ["circuit-builder-star"] }).slice(0, 4);
    const html = renderToStaticMarkup(createElement(GameArcade, { tiles }));
    expect(html).toContain("arcade-tile");
    expect(html).toContain("Play next");
    expect(html).toContain("Game arcade");
  });

  it("puts Sign in on the right and keeps Store out of the header", () => {
    const html = renderToStaticMarkup(createElement(SiteHeaderView, { nav: headerNav(null) }));
    expect(html).toContain("header-account");
    expect(html).toContain("Sign in");
    expect(html).not.toContain(">Store<");
  });

  it("lists tappable interest cards", () => {
    expect(INTEREST_CARDS.length).toBeGreaterThanOrEqual(6);
    expect(INTEREST_CARDS.every((card) => card.icon && card.tag.includes("."))).toBe(true);
  });
});
