import { describe, expect, it } from "vitest";
import { realScenarios } from "@/lib/real-scenarios";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import type { Scenario } from "@/lib/market";
import {
  arrangeFirstSession,
  chartSentence,
  isClearTrend,
  sessionProgress,
  setupKind,
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

function assertEasyOpen(deck: Scenario[], seed: number) {
  const order = arrangeFirstSession(deck, mulberry32(seed));
  expect(new Set(order).size, `seed ${seed}`).toBe(deck.length);
  expect(order.length, `seed ${seed}`).toBe(deck.length);
  const first = order.slice(0, 5).map((i) => deck[i]);
  for (const s of first.slice(0, 3)) {
    expect(setupKind(s), `${s.id} seed ${seed}`).not.toBe("edge");
    expect(isClearTrend(s), `${s.id} seed ${seed}`).toBe(true);
  }
  const kinds = first.slice(0, 3).map(setupKind);
  expect(kinds.includes("up"), `seed ${seed}`).toBe(true);
  expect(kinds.includes("down"), `seed ${seed}`).toBe(true);
  const edgeAt = first.findIndex((s) => s.correct === "sideways");
  expect(edgeAt === 3 || edgeAt === 4, `seed ${seed} edge at ${edgeAt}`).toBe(true);
  expect(
    first.slice(0, 3).some((s) => s.correct === "sideways"),
    `seed ${seed}`,
  ).toBe(false);
}

describe("first session order", () => {
  it("opens practice on clear trends and holds no edge until setup 4 or 5", () => {
    for (let seed = 1; seed <= 24; seed++) assertEasyOpen(practiceScenarios, seed);
    const clear = practiceScenarios.filter(isClearTrend).map((s) => s.id);
    expect(clear.sort()).toEqual(["asc-tri", "bull-flag", "desc-tri"]);
  });

  it("opens the real deck the same way, using trend tags", () => {
    expect(realScenarios.length).toBeGreaterThan(30);
    for (let seed = 1; seed <= 12; seed++) assertEasyOpen(realScenarios, seed);
    const sample = arrangeFirstSession(realScenarios, mulberry32(4))
      .slice(0, 3)
      .map((i) => realScenarios[i]);
    for (const s of sample) {
      const tags = s.tags ?? [];
      if (s.correct === "up") expect(tags).toContain("uptrend");
      if (s.correct === "down") expect(tags).toContain("downtrend");
    }
  });
});

describe("session length", () => {
  it("counts five charts, then a short last sitting", () => {
    expect(sessionProgress(0, 14)).toEqual({ index: 0, size: 5 });
    expect(sessionProgress(4, 14)).toEqual({ index: 4, size: 5 });
    expect(sessionProgress(5, 14)).toEqual({ index: 0, size: 5 });
    expect(sessionProgress(10, 14)).toEqual({ index: 0, size: 4 });
    expect(sessionProgress(13, 14)).toEqual({ index: 3, size: 4 });
  });
});

describe("chart sentence", () => {
  it("uses one sentence about the chart, not the scoring rule", () => {
    const bull = practiceScenarios.find((s) => s.id === "bull-flag")!;
    const sentence = chartSentence(bull);
    expect(sentence.endsWith(".")).toBe(true);
    expect(sentence.split(/(?<=[.!?])\s+/).length).toBe(1);
    const real = realScenarios.find(
      (s) => (s.tags ?? []).includes("uptrend") && s.correct === "up",
    )!;
    const about = chartSentence(real);
    expect(about.startsWith("Into the marker")).toBe(true);
    expect(about.includes("so the answer")).toBe(false);
  });
});
