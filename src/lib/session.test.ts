import { describe, expect, it } from "vitest";
import { chartSentence } from "@/lib/chart-copy";
import type { Scenario } from "@/lib/market";
import { upcomingMornings } from "@/lib/reminder";
import { realScenarios } from "@/lib/real-scenarios";
import { scenarios as practice } from "@/lib/scenarios";
import {
  NO_EDGE_FROM,
  SESSION_SIZE,
  advance,
  atSessionBreak,
  continueSession,
  easyFirstOrder,
  finishedSessionHits,
  freshOrder,
  isObviousDown,
  isObviousUp,
  parseOrder,
  playingLabel,
} from "@/lib/session";

function randFrom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stub(id: string, correct: Scenario["correct"], tags: string[] = []): Scenario {
  return {
    id,
    pattern: id,
    correct,
    tags,
    revealAt: 1,
    candles: [],
    guides: [],
    useful: [],
    explanation: "A clear trend into the call. The next part is the outcome.",
    indicatorNote: "",
    caution: "",
  };
}

function assertEasy(deck: readonly Scenario[], seed: number) {
  const order = easyFirstOrder(deck, randFrom(seed));
  expect(new Set(order).size).toBe(deck.length);
  expect(order).toHaveLength(deck.length);
  const lead = order.slice(0, Math.min(NO_EDGE_FROM, deck.length)).map((i) => deck[i]!);
  for (const s of lead) expect(s.correct).not.toBe("sideways");
  const obvious = lead.filter((s) => isObviousUp(s) || isObviousDown(s));
  const obviousCount = deck.filter((s) => isObviousUp(s) || isObviousDown(s)).length;
  expect(obvious.length).toBe(Math.min(NO_EDGE_FROM, obviousCount));
  if (deck.some((s) => s.correct === "up" && isObviousUp(s)) && deck.some((s) => isObviousDown(s))) {
    expect(isObviousUp(lead[0]!)).toBe(true);
  }
  if (deck.some((s) => s.correct === "sideways") && deck.length > NO_EDGE_FROM) {
    expect(deck[order[NO_EDGE_FROM]!]?.correct).toBe("sideways");
    for (const index of order.slice(0, NO_EDGE_FROM)) expect(deck[index]?.correct).not.toBe("sideways");
  }
}

describe("easy first session", () => {
  const mixed: Scenario[] = [
    stub("range", "sideways", ["range"]),
    stub("up-1", "up", ["uptrend"]),
    stub("trap", "down", ["uptrend"]),
    stub("down-1", "down", ["downtrend"]),
    stub("chop", "sideways", ["range"]),
    stub("up-hot", "up", ["uptrend", "overbought"]),
    stub("down-2", "down", ["downtrend"]),
    stub("up-2", "up", ["uptrend", "volume-spike"]),
    stub("other", "up", ["range"]),
  ];

  it("keeps no-edge charts at setup 4 or later and opens on a clear trend", () => {
    for (let seed = 1; seed <= 30; seed++) {
      assertEasy(mixed, seed);
      assertEasy(practice, seed);
      if (realScenarios.length > 0) assertEasy(realScenarios, seed);
    }
  });

  it("treats a clean uptrend as obvious and a mixed tag as not", () => {
    expect(isObviousUp(stub("a", "up", ["uptrend"]))).toBe(true);
    expect(isObviousUp(stub("b", "up", ["uptrend", "overbought"]))).toBe(false);
    expect(isObviousUp(stub("c", "down", ["uptrend"]))).toBe(false);
    expect(isObviousDown(stub("d", "down", ["downtrend"]))).toBe(true);
    expect(isObviousDown(stub("e", "down", ["downtrend", "oversold"]))).toBe(false);
    expect(isObviousUp(practice.find((s) => s.id === "bull-flag")!)).toBe(true);
    expect(isObviousDown(practice.find((s) => s.id === "desc-tri")!)).toBe(true);
    expect(isObviousUp(practice.find((s) => s.id === "hs-top")!)).toBe(false);
  });
});

describe("sittings", () => {
  it("breaks every session and keeps the score of that sitting", () => {
    const deck = practice;
    let state = freshOrder(deck, true, randFrom(4));
    const seen: number[] = [];
    for (let n = 0; n < SESSION_SIZE; n++) {
      seen.push(state.order[state.pos]!);
      state = { ...state, hits: [...state.hits, n % 2 === 0] };
      state = advance({ ...state, hits: state.hits.slice(0, -1).concat(n % 2 === 0) });
    }
    expect(atSessionBreak(state)).toBe(true);
    expect(finishedSessionHits(state)).toHaveLength(SESSION_SIZE);
    expect(playingLabel(0, deck.length)).toBe("Setup 1 of 8");
    const next = continueSession(state, deck, randFrom(9));
    expect(atSessionBreak(next)).toBe(false);
    expect(next.pos).toBe(SESSION_SIZE);
    expect(next.order[next.pos]).toBe(seen.length ? state.order[SESSION_SIZE] : undefined);
  });

  it("ignores a pre-session saved order that lands on a boundary", () => {
    const raw = JSON.stringify({ order: [0, 1, 2, 3, 4, 5, 6, 7, 8], pos: 8 });
    const parsed = parseOrder(raw, 9);
    expect(parsed).not.toBeNull();
    expect(atSessionBreak(parsed!)).toBe(false);
  });
});

describe("chart sentence", () => {
  it("uses one sentence and does not spoil a real chart's outcome", () => {
    const bull = practice.find((s) => s.id === "bull-flag")!;
    const sentence = chartSentence(bull);
    expect(sentence.endsWith(".")).toBe(true);
    expect(sentence.split(".").filter(Boolean)).toHaveLength(1);
    const real: Scenario = {
      ...stub("AMZN", "up", ["uptrend"]),
      explanation:
        "Real daily chart. Into the marker the stock had moved +13.4% over 60 sessions. Over the next 20 sessions it went +5.3%, so the answer is higher.",
    };
    expect(chartSentence(real)).toBe("Into the marker the stock had moved +13.4% over 60 sessions.");
  });
});

describe("reminder schedule", () => {
  it("picks the next three 9:00 mornings and skips a time already passed", () => {
    const morning = upcomingMornings(new Date(2026, 10, 11, 8, 30), 9, 3);
    expect(morning.map((d) => d.getDate())).toEqual([11, 12, 13]);
    const afternoon = upcomingMornings(new Date(2026, 10, 11, 9, 5), 9, 3);
    expect(afternoon.map((d) => d.getDate())).toEqual([12, 13, 14]);
    for (const at of afternoon) expect(at.getHours()).toBe(9);
  });
});
