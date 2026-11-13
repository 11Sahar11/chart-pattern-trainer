import { describe, expect, it } from "vitest";
import type { Scenario } from "@/lib/market";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import {
  answersIntoBlock,
  arrangeFirstSession,
  chartSentence,
  completesSession,
  FIRST_SESSION_IDS,
} from "@/lib/session";

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fixture(partial: Partial<Scenario> & Pick<Scenario, "id" | "explanation">): Scenario {
  return {
    pattern: partial.id,
    correct: "up",
    revealAt: 1,
    candles: [],
    guides: [],
    useful: [],
    indicatorNote: "",
    caution: "",
    ...partial,
  };
}

describe("first session order", () => {
  it("keeps a fixed opening and holds traps out of slots 4 and 5", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const order = arrangeFirstSession(practiceScenarios, mulberry32(seed));
      const ids = order.map((i) => practiceScenarios[i].id);
      expect(new Set(order).size, `seed ${seed}`).toBe(practiceScenarios.length);
      expect(ids.slice(0, 5), `seed ${seed}`).toEqual([...FIRST_SESSION_IDS]);
      expect(ids.indexOf("failed-top"), `seed ${seed}`).toBeGreaterThanOrEqual(5);
      expect(ids.indexOf("rsi-div"), `seed ${seed}`).toBeGreaterThanOrEqual(5);
    }
  });
});

describe("when a practice sitting ends", () => {
  it("waits for 10 calls or the last chart, not the 5th", () => {
    expect(completesSession(4, 14)).toBe(false);
    expect(completesSession(8, 14)).toBe(false);
    expect(completesSession(9, 14)).toBe(true);
    expect(completesSession(13, 14)).toBe(true);
    expect(completesSession(19, 30)).toBe(true);
    expect(completesSession(0, 14)).toBe(false);
    expect(answersIntoBlock(0)).toBe(0);
    expect(answersIntoBlock(9)).toBe(9);
    expect(answersIntoBlock(10)).toBe(0);
  });
});

describe("chart sentence", () => {
  it("uses one sentence about the chart, not the scoring rule", () => {
    const bull = practiceScenarios.find((s) => s.id === "bull-flag")!;
    const sentence = chartSentence(bull);
    expect(sentence.endsWith(".")).toBe(true);
    expect(sentence.split(/(?<=[.!?])\s+/).length).toBe(1);

    const realish = fixture({
      id: "fixture-up",
      explanation:
        "Real daily chart. Into the marker the stock had moved +13.4% over 60 sessions. Over the next 20 sessions it went +5.3%, so the answer is higher.",
    });
    const about = chartSentence(realish);
    expect(about.startsWith("Into the marker")).toBe(true);
    expect(about.includes("so the answer")).toBe(false);

    const moment = fixture({
      id: "fixture-moment",
      explanation: "Real daily chart. Into the marker the stock had moved +1% over 60 sessions.",
      source: {
        ticker: "QQQ",
        from: "2000-01-01",
        to: "2000-06-01",
        move: -2,
        blurb: "March 2000: tech stocks had gone nearly vertical. The drop came next.",
      },
    });
    expect(chartSentence(moment)).toBe("March 2000: tech stocks had gone nearly vertical.");
  });
});
