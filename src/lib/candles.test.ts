import { describe, expect, it } from "vitest";
import { candlePatterns, exampleCandles } from "@/lib/candles";
import { drift, type Candle } from "@/lib/market";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import { buildDailySet } from "@/lib/daily-set";
import { availableOn, chartsForLesson } from "@/lib/indicators";

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

function assertOhlc(c: { open: number; high: number; low: number; close: number }, where: string) {
  expect(Number.isFinite(c.open), where).toBe(true);
  expect(Number.isFinite(c.high), where).toBe(true);
  expect(Number.isFinite(c.low), where).toBe(true);
  expect(Number.isFinite(c.close), where).toBe(true);
  expect(c.high, where).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
  expect(c.low, where).toBeLessThanOrEqual(Math.min(c.open, c.close));
  expect(c.high, where).toBeGreaterThanOrEqual(c.low);
}

describe("candlestick OHLC", () => {
  it("keeps every pattern's idealized example valid", () => {
    for (const pattern of candlePatterns) {
      for (const [o, h, l, c] of pattern.example)
        assertOhlc({ open: o, high: h, low: l, close: c }, pattern.slug);
      for (const candle of exampleCandles(pattern)) assertOhlc(candle, `${pattern.slug} drawn`);
    }
  });

  it("keeps open and close inside high-low across many seeded samples", () => {
    const samples = 40;
    for (const pattern of candlePatterns) {
      for (let seed = 0; seed < samples; seed++) {
        const rand = mulberry32(seed * 997 + pattern.slug.length);
        const candles = exampleCandles(pattern, rand);
        expect(candles.length).toBeGreaterThan(pattern.count);
        candles.forEach((candle, i) => assertOhlc(candle, `${pattern.slug} seed ${seed} bar ${i}`));
      }
    }
  });
});

describe("no-edge setups", () => {
  const flat = practiceScenarios.filter((s) => s.correct === "sideways");

  it("includes a balanced set of genuinely sideways practice charts", () => {
    const counts = { up: 0, down: 0, sideways: 0 };
    for (const s of practiceScenarios) counts[s.correct] += 1;
    expect(flat.length).toBeGreaterThanOrEqual(4);
    expect(counts.sideways).toBeGreaterThanOrEqual(Math.min(counts.up, counts.down));
    for (const s of flat) {
      expect(drift(s.candles, s.revealAt), s.id).toBe("sideways");
      const first = s.candles[0].close;
      const atCall = s.candles[s.revealAt - 1].close;
      const into = Math.abs(atCall / first - 1);
      expect(into, s.id).toBeLessThan(0.06);
      const recentFrom = s.candles[Math.max(0, s.revealAt - 11)].close;
      expect(Math.abs(atCall / recentFrom - 1), s.id).toBeLessThan(0.08);
      for (const candle of s.candles) assertOhlc(candle, s.id);
    }
  });

  it("gives every daily set a higher, a lower, and a no-edge chart", () => {
    for (let day = 1; day <= 40; day++) {
      const set = buildDailySet(day);
      expect(set).toHaveLength(5);
      expect(new Set(set.map((s) => s.id)).size).toBe(5);
      const dirs = new Set(set.map((s) => s.correct));
      expect(dirs.has("up"), `day ${day}`).toBe(true);
      expect(dirs.has("down"), `day ${day}`).toBe(true);
      expect(dirs.has("sideways"), `day ${day}`).toBe(true);
    }
    expect(buildDailySet(7).map((s) => s.id)).toEqual(buildDailySet(7).map((s) => s.id));
  });
});

describe("SMA 50 lesson charts", () => {
  it("only uses charts with enough history to draw and judge SMA 50", () => {
    const before = practiceScenarios.map((s) => s.revealAt);
    const charts = chartsForLesson("sma50", practiceScenarios);
    expect(charts.length).toBe(practiceScenarios.length);
    expect(practiceScenarios.map((s) => s.revealAt)).toEqual(before);
    for (const s of charts) {
      expect(s.revealAt).toBeGreaterThanOrEqual(55);
      expect(availableOn(s, "sma50"), s.id).toBe(true);
      for (const candle of s.candles) assertOhlc(candle, s.id);
      const times = s.candles.map((c: Candle) => c.time);
      expect([...times].sort()).toEqual(times);
      expect(new Set(times).size).toBe(times.length);
    }
  });
});
