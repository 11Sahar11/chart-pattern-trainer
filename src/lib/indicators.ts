import {
  bollinger,
  ema,
  macd,
  obv,
  rsi,
  sma,
  stochastic,
  type Candle,
  type Direction,
  type IndicatorId,
  type Scenario,
} from "@/lib/market";

export type IndicatorInfo = {
  id: IndicatorId;
  name: string;
  short: string;
  /** Fits a phone-width indicator button. */
  chip: string;
  /** Drawn on the price chart, or in its own panel underneath. */
  kind: "overlay" | "pane";
  /** Tailwind background class for the legend swatch. */
  swatch: string;
  family: "Trend" | "Volatility" | "Volume" | "Momentum";
  summary: string;
  whatItIs: string;
  howToRead: string[];
  pitfalls: string;
};

/** In the order they appear on screen. */
export const indicatorInfo: IndicatorInfo[] = [
  {
    id: "sma",
    name: "Simple Moving Average (20)",
    short: "SMA 20",
    chip: "SMA 20",
    kind: "overlay",
    swatch: "bg-sma",
    family: "Trend",
    summary: "The 20-day simple moving average: the average close of the last month of trading.",
    whatItIs:
      "The average of the last 20 closing prices, redrawn every day. It smooths out daily noise so the short-term trend is easier to see.",
    howToRead: [
      "Price above a rising SMA 20: the short-term trend is up.",
      "Price below a falling SMA 20: the short-term trend is down.",
      "A flat SMA with price crossing back and forth: no trend, so trend signals mean little.",
    ],
    pitfalls: "It lags. By the time the average turns, much of the move can be over.",
  },
  {
    id: "sma50",
    name: "Simple Moving Average (50)",
    short: "SMA 50",
    chip: "SMA 50",
    kind: "overlay",
    swatch: "bg-sma50",
    family: "Trend",
    summary: "The 50-day moving average: the trend line many traders and funds watch.",
    whatItIs:
      "The average close of the last 50 sessions, about ten weeks. It shows the medium-term trend and often acts as support in uptrends and resistance in downtrends.",
    howToRead: [
      "Price holding above a rising SMA 50: the medium-term trend is healthy.",
      "A close below a rising SMA 50 is an early warning; below a falling one is a downtrend.",
      "Pullbacks that stop at the SMA 50 and turn up are a classic buy-the-dip spot.",
    ],
    pitfalls: "Slow to react. In fast markets price can be far from it before it turns.",
  },
  {
    id: "ema",
    name: "Exponential Moving Average (12)",
    short: "EMA 12",
    chip: "EMA 12",
    kind: "overlay",
    swatch: "bg-ema",
    family: "Trend",
    summary: "A 12-day average that weights recent prices more, so it reacts faster than a simple average.",
    whatItIs:
      "Like a moving average, but each day's weight decays exponentially, so the latest closes count most. It hugs price closely.",
    howToRead: [
      "Price riding above the EMA 12: short-term momentum is up.",
      "Price stretched far from it tends to snap back toward it.",
      "Crosses of price through the EMA are early, noisy signals.",
    ],
    pitfalls: "Fast means noisy. In a range it flips back and forth and gives many false signals.",
  },
  {
    id: "bb",
    name: "Bollinger Bands (20, 2)",
    short: "Bollinger",
    chip: "Bands",
    kind: "overlay",
    swatch: "bg-bb",
    family: "Volatility",
    summary: "Bands two standard deviations around the 20-day average that widen and narrow with volatility.",
    whatItIs:
      "A 20-day average with an upper and lower band set two standard deviations away. About 95% of closes land inside the bands in normal conditions.",
    howToRead: [
      "A close outside the upper band means price is stretched; in a range it often snaps back.",
      "A close below the lower band is stretched to the downside.",
      "Bands squeezing tight signal low volatility, which often comes before a big move.",
    ],
    pitfalls: "In strong trends price can 'walk the band' for weeks. Outside the band is not automatically a reversal.",
  },
  {
    id: "volume",
    name: "Volume",
    short: "Volume",
    chip: "Volume",
    kind: "overlay",
    swatch: "bg-pencil",
    family: "Volume",
    summary: "How many shares traded each day. It shows how much conviction is behind a move.",
    whatItIs:
      "The number of shares traded per session, drawn as bars under the price. Big moves on big volume are taken more seriously than moves on light volume.",
    howToRead: [
      "A breakout on volume well above average is more likely to hold.",
      "Volume fading during a pullback is healthy in an uptrend.",
      "A huge-volume day after a long move can mark exhaustion.",
    ],
    pitfalls: "Volume confirms, it rarely predicts on its own. Always read it with price.",
  },
  {
    id: "obv",
    name: "On-Balance Volume",
    short: "OBV",
    chip: "OBV",
    kind: "pane",
    swatch: "bg-primary",
    family: "Volume",
    summary: "A running total that adds volume on up days and subtracts it on down days.",
    whatItIs:
      "OBV keeps a running total: all of a day's volume is added if the stock closed up and subtracted if it closed down. Its trend shows whether volume is flowing in or out.",
    howToRead: [
      "OBV rising while price is flat suggests buyers accumulating quietly.",
      "OBV falling while price holds up is a warning of distribution.",
      "A new OBV high ahead of a price high often confirms the breakout.",
    ],
    pitfalls: "One giant-volume day can bend the line for weeks. Watch its direction, not its level.",
  },
  {
    id: "rsi",
    name: "Relative Strength Index (14)",
    short: "RSI 14",
    chip: "RSI 14",
    kind: "pane",
    swatch: "bg-fg",
    family: "Momentum",
    summary: "A 0–100 momentum gauge: above 70 is overbought, below 30 is oversold.",
    whatItIs:
      "RSI compares the size of recent up days to recent down days over 14 sessions and scales the result from 0 to 100.",
    howToRead: [
      "Above 70: overbought. Momentum is stretched to the upside.",
      "Below 30: oversold. Momentum is stretched to the downside.",
      "Divergence, price making a new high while RSI does not, warns momentum is fading.",
    ],
    pitfalls: "In strong trends RSI can stay overbought or oversold for a long time.",
  },
  {
    id: "macd",
    name: "MACD (12, 26, 9)",
    short: "MACD",
    chip: "MACD",
    kind: "pane",
    swatch: "bg-sma",
    family: "Momentum",
    summary: "The gap between a fast and a slow moving average, with a signal line that shows when momentum turns.",
    whatItIs:
      "MACD is the 12-day EMA minus the 26-day EMA. The signal line is a 9-day average of MACD, and the histogram shows the distance between them.",
    howToRead: [
      "MACD crossing above its signal line: momentum turning up.",
      "MACD crossing below its signal line: momentum turning down.",
      "A shrinking histogram means the current push is losing strength.",
    ],
    pitfalls: "Built from moving averages, so it lags. Crosses inside a range are mostly noise.",
  },
  {
    id: "stoch",
    name: "Stochastic Oscillator (14, 3)",
    short: "Stochastic",
    chip: "Stoch",
    kind: "pane",
    swatch: "bg-ema",
    family: "Momentum",
    summary: "Where the close sits within the last 14 days' range: above 80 is overbought, below 20 oversold.",
    whatItIs:
      "The stochastic shows where today's close is relative to the high-low range of the last 14 sessions, from 0 (at the low) to 100 (at the high), smoothed into a %K and %D line.",
    howToRead: [
      "Above 80: closing near the top of the range, overbought.",
      "Below 20: closing near the bottom, oversold.",
      "%K crossing %D at an extreme is the classic turn signal.",
    ],
    pitfalls: "Very sensitive. In trends it pins at an extreme and gives early, wrong reversal calls.",
  },
];

export const infoById = new Map(indicatorInfo.map((i) => [i.id, i]));

// ---------- what each indicator said at the call ----------

/** `na`: the chart is too short for this indicator, so it is never offered. */
export type Read = { dir: Direction; text: string; na?: boolean };

const pct = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

function at<T extends { time: string; value: number }>(rows: T[], time: string): number | undefined {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].time === time) return rows[i].value;
  return undefined;
}

function before<T extends { time: string; value: number }>(rows: T[], time: string, back: number) {
  const i = rows.findIndex((r) => r.time === time);
  return i - back >= 0 ? rows[i - back].value : undefined;
}

/** Each indicator's read at the last visible candle. Cached per scenario. */
const readCache = new WeakMap<Scenario, Record<IndicatorId, Read>>();

export function readsFor(s: Scenario): Record<IndicatorId, Read> {
  const hit = readCache.get(s);
  if (hit) return hit;
  const shown: Candle[] = s.candles.slice(0, s.revealAt);
  const last = shown[shown.length - 1];
  const t = last.time;
  const price = last.close;
  const none = (text: string): Read => ({ dir: "sideways", text });
  const na: Read = { dir: "sideways", text: "not enough history on this chart", na: true };

  const s20 = at(sma(shown, 20), t);
  const s20p = before(sma(shown, 20), t, 5);
  const s50 = at(sma(shown, 50), t);
  const s50p = before(sma(shown, 50), t, 5);
  const e12 = at(ema(shown, 12), t);
  const bands = bollinger(shown);
  const up = at(bands.upper, t);
  const lo = at(bands.lower, t);
  const r = at(rsi(shown, 14), t);
  const m = macd(shown);
  const mLine = at(m.line, t);
  const mSig = at(m.signal, t);
  const h = at(m.hist, t);
  const hPrev = before(m.hist, t, 1);
  const st = at(stochastic(shown).k, t);
  const ob = obv(shown);
  const obNow = at(ob, t);
  const obThen = before(ob, t, 10);
  const vol10 = shown.slice(-10).reduce((a, c) => a + c.volume, 0) || 1;
  const v5 = shown.slice(-5).reduce((a, c) => a + c.volume, 0) / 5;
  const v20 = shown.slice(-25, -5).reduce((a, c) => a + c.volume, 0) / 20 || 1;
  const push5 = price / shown[shown.length - 6].close - 1;

  const reads: Record<IndicatorId, Read> = {
    sma:
      s20 == null || s20p == null
        ? na
        : price > s20 && s20 > s20p
          ? { dir: "up", text: "price above a rising SMA 20" }
          : price < s20 && s20 < s20p
            ? { dir: "down", text: "price below a falling SMA 20" }
            : none("price tangled with a flat SMA 20"),
    sma50:
      s50 == null || s50p == null
        ? na
        : price > s50 && s50 > s50p
          ? { dir: "up", text: "price above a rising SMA 50" }
          : price < s50 && s50 < s50p
            ? { dir: "down", text: "price below a falling SMA 50" }
            : none("price and the SMA 50 disagree"),
    ema:
      e12 == null
        ? na
        : price > e12 * 1.01
          ? { dir: "up", text: `price ${pct(price / e12 - 1)} above EMA 12` }
          : price < e12 * 0.99
            ? { dir: "down", text: `price ${pct(price / e12 - 1)} below EMA 12` }
            : none("price sitting on the EMA 12"),
    bb:
      up == null || lo == null
        ? na
        : price > up
          ? { dir: "down", text: "close above the upper band, stretched" }
          : price < lo
            ? { dir: "up", text: "close below the lower band, stretched" }
            : none("price inside the bands"),
    volume:
      v5 / v20 > 1.3
        ? { dir: push5 > 0 ? "up" : "down", text: `volume ${(v5 / v20).toFixed(1)}x average on a push ${push5 > 0 ? "up" : "down"}` }
        : none(`volume ${(v5 / v20).toFixed(1)}x average, nothing unusual`),
    obv:
      obNow == null || obThen == null
        ? na
        : (obNow - obThen) / vol10 > 0.25
          ? { dir: "up", text: "OBV climbing: volume flowing in" }
          : (obNow - obThen) / vol10 < -0.25
            ? { dir: "down", text: "OBV falling: volume flowing out" }
            : none("OBV flat"),
    rsi:
      r == null
        ? na
        : r >= 70
          ? { dir: "down", text: `RSI ${r.toFixed(0)}, overbought` }
          : r <= 30
            ? { dir: "up", text: `RSI ${r.toFixed(0)}, oversold` }
            : r > 55
              ? { dir: "up", text: `RSI ${r.toFixed(0)}, momentum up` }
              : r < 45
                ? { dir: "down", text: `RSI ${r.toFixed(0)}, momentum down` }
                : none(`RSI ${r.toFixed(0)}, neutral`),
    macd:
      mLine == null || mSig == null || h == null || hPrev == null
        ? na
        : mLine > mSig && h > hPrev
          ? { dir: "up", text: "MACD above its signal and widening" }
          : mLine < mSig && h < hPrev
            ? { dir: "down", text: "MACD below its signal and widening" }
            : none("MACD and signal converging"),
    stoch:
      st == null
        ? na
        : st > 80
          ? { dir: "down", text: `stochastic ${st.toFixed(0)}, overbought` }
          : st < 20
            ? { dir: "up", text: `stochastic ${st.toFixed(0)}, oversold` }
            : none(`stochastic ${st.toFixed(0)}, mid-range`),
  };
  readCache.set(s, reads);
  return reads;
}

// ---------- did it help? ----------

export type Verdict = "helped" | "misled" | "neutral";

/**
 * Helped: pointed to what happened. Misled: pointed the other way.
 * Neutral: no clear signal. Practice setups keep their hand-written
 * "useful" list for the four original indicators.
 */
export function verdictFor(s: Scenario, id: IndicatorId): Verdict {
  const read = readsFor(s)[id];
  const original = ["sma", "ema", "volume", "rsi"].includes(id);
  if (original && s.useful.includes(id)) return "helped";
  if (read.dir === "sideways") return "neutral";
  if (read.dir === s.correct) return original ? "neutral" : "helped";
  return "misled";
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const OFFERED = 4;

/**
 * The indicators this chart offers: up to two that helped, at least one
 * that misled when there is one, and the rest at random. The same chart
 * always offers the same set, so the Daily is fair.
 */
export function offeredFor(s: Scenario, include?: IndicatorId): IndicatorId[] {
  const rand = seeded(hash(s.id));
  const shuffle = <T,>(a: T[]) => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
  };
  const ids = indicatorInfo.map((i) => i.id).filter((id) => id === include || !readsFor(s)[id].na);
  const by = (v: Verdict) => shuffle(ids.filter((id) => verdictFor(s, id) === v));
  const pick = new Set<IndicatorId>();
  if (include) pick.add(include);
  for (const id of by("helped").slice(0, 2)) if (pick.size < OFFERED) pick.add(id);
  for (const id of by("misled").slice(0, 1)) if (pick.size < OFFERED) pick.add(id);
  for (const id of shuffle(ids)) if (pick.size < OFFERED) pick.add(id);
  return indicatorInfo.map((i) => i.id).filter((id) => pick.has(id));
}

/** Can this indicator be drawn and judged on this chart? */
export function availableOn(s: Scenario, id: IndicatorId): boolean {
  return !readsFor(s)[id].na;
}

/** The one-line read shown after the reveal. */
export function readText(s: Scenario, id: IndicatorId): string {
  const r = readsFor(s)[id];
  // Hand-written practice notes can credit an indicator for something a simple
  // rule can't see, such as divergence. Point there instead of contradicting it.
  if (verdictFor(s, id) === "helped" && r.dir !== s.correct) return "how it helped is in “Why it moved”";
  return r.text;
}

/** Was leaving this indicator on or off the right choice? Neutral ones are not scored. */
export function pickWasRight(v: Verdict, used: boolean): boolean | null {
  if (v === "neutral") return null;
  return v === "helped" ? used : !used;
}
