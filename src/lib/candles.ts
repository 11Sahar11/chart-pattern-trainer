import type { Candle, Direction } from "@/lib/market";

/** [open, high, low, close] in an abstract price scale, higher = higher price. */
export type Ohlc = [number, number, number, number];

export type CandleBias = "Bullish reversal" | "Bearish reversal" | "Indecision" | "Strength";

export type CandlePattern = {
  slug: string;
  name: string;
  /** Fits a quiz answer button. */
  short: string;
  count: 1 | 2 | 3;
  bias: CandleBias;
  /** What it points to when it appears in the right context. */
  points: Direction;
  /** Trend that must come before it to count. */
  after: "downtrend" | "uptrend" | "any";
  summary: string;
  whatItIs: string;
  howToSpot: string[];
  context: string;
  failure: string;
  /** Idealized shape, drawn on lesson pages and in the quiz. */
  example: Ohlc[];
};

export const candlePatterns: CandlePattern[] = [
  {
    slug: "hammer",
    name: "Hammer",
    short: "Hammer",
    count: 1,
    bias: "Bullish reversal",
    points: "up",
    after: "downtrend",
    summary: "A small body at the top and a long lower wick after a decline: sellers pushed hard, buyers pushed back.",
    whatItIs:
      "During the session sellers drove price well below the open, then buyers took over and closed it near the high. The long lower wick is the rejected selling.",
    howToSpot: [
      "Lower wick at least twice the size of the body.",
      "Little or no upper wick.",
      "Appears after a decline. The body color matters less than the shape.",
    ],
    context: "Only meaningful after a downtrend, ideally at support. The same shape after a rally is a hanging man.",
    failure: "If the next candle closes below the hammer's low, the buyers' defense failed.",
    example: [[44, 46, 22, 46]],
  },
  {
    slug: "inverted-hammer",
    name: "Inverted Hammer",
    short: "Inv. hammer",
    count: 1,
    bias: "Bullish reversal",
    points: "up",
    after: "downtrend",
    summary: "A small body at the bottom with a long upper wick after a decline: the first test by buyers.",
    whatItIs:
      "Buyers pushed price well above the open but could not hold it. After a downtrend, even a failed push up shows sellers are losing control.",
    howToSpot: [
      "Upper wick at least twice the body.",
      "Little or no lower wick.",
      "Appears after a decline.",
    ],
    context: "Weaker than a hammer on its own. It needs a strong up candle the next day to confirm.",
    failure: "A next candle that closes lower turns it into just another down day.",
    example: [[30, 52, 29, 33]],
  },
  {
    slug: "hanging-man",
    name: "Hanging Man",
    short: "Hanging man",
    count: 1,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "The hammer shape, but after a rally. A warning that sellers showed up in force during the day.",
    whatItIs:
      "It looks exactly like a hammer, but it appears after an advance. The long lower wick shows a sharp intraday sell-off that buyers only just recovered.",
    howToSpot: [
      "Long lower wick, at least twice the body.",
      "Small body near the top of the range.",
      "Appears after an advance.",
    ],
    context: "A warning, not a signal. It needs a lower close the next day to matter.",
    failure: "Price keeps climbing above its high. In strong uptrends this shape appears often and means little.",
    example: [[72, 74, 52, 74]],
  },
  {
    slug: "shooting-star",
    name: "Shooting Star",
    short: "Shooting star",
    count: 1,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "A long upper wick after a rally: buyers reached for new highs and got slapped back down.",
    whatItIs:
      "Price opened, rallied hard, then gave nearly all of it back by the close. After an uptrend, that rejection of higher prices is a classic topping sign.",
    howToSpot: [
      "Upper wick at least twice the body.",
      "Small body near the low of the range.",
      "Appears after an advance, often at resistance.",
    ],
    context: "Strongest at resistance or after an extended run. Same shape after a decline is an inverted hammer.",
    failure: "A close above the shooting star's high cancels it.",
    example: [[72, 92, 71, 70]],
  },
  {
    slug: "doji",
    name: "Doji",
    short: "Doji",
    count: 1,
    bias: "Indecision",
    points: "sideways",
    after: "any",
    summary: "Open and close at almost the same price: neither buyers nor sellers won the day.",
    whatItIs:
      "A doji has almost no body. After a strong move it shows the move ran out of conviction; inside a range it means very little.",
    howToSpot: [
      "Body tiny compared with the day's range.",
      "Wicks can be long or short; long-legged dojis show more indecision.",
    ],
    context: "Worth noticing after a long run in one direction. Wait for the next candle to show who wins.",
    failure: "On its own it predicts direction poorly. Treat it as a pause, not a turn.",
    example: [[50, 60, 40, 50.5]],
  },
  {
    slug: "marubozu",
    name: "Marubozu (strong candle)",
    short: "Marubozu",
    count: 1,
    bias: "Strength",
    points: "up",
    after: "any",
    summary: "A big body with little or no wick: one side controlled the whole session, open to close.",
    whatItIs:
      "The Japanese word means 'bald'. The candle opens at one extreme and closes at the other, so one side was in control all day. A green marubozu shows strong buying; a red one, strong selling.",
    howToSpot: [
      "Body takes up almost the whole range.",
      "Clearly bigger than the recent candles.",
      "Direction comes from the color: up close or down close.",
    ],
    context: "Out of a range or at a breakout it often starts a move. After a long run it can mark exhaustion.",
    failure: "If the next sessions erase most of it, the strength was a one-day burst.",
    example: [[30, 66, 30, 66]],
  },
  {
    slug: "bullish-engulfing",
    name: "Bullish Engulfing",
    short: "Bull engulfing",
    count: 2,
    bias: "Bullish reversal",
    points: "up",
    after: "downtrend",
    summary: "A green candle whose body swallows the previous red one: buyers took the whole prior day back.",
    whatItIs:
      "After a decline, a down day is followed by an up day that opens at or below its close and closes above its open. The buyers overwhelmed everything the sellers did the day before.",
    howToSpot: [
      "First candle red, second green.",
      "Second body fully covers the first body.",
      "Appears after a decline.",
    ],
    context: "Stronger when the second candle is large and on high volume, and at support.",
    failure: "A close back below the engulfing candle's low cancels it.",
    example: [[44, 45, 38, 39], [37, 50, 36, 49]],
  },
  {
    slug: "bearish-engulfing",
    name: "Bearish Engulfing",
    short: "Bear engulfing",
    count: 2,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "A red candle whose body swallows the previous green one: sellers erased the whole prior day.",
    whatItIs:
      "After a rally, an up day is followed by a down day that opens at or above its close and closes below its open.",
    howToSpot: ["First candle green, second red.", "Second body fully covers the first.", "Appears after an advance."],
    context: "Stronger at resistance and on heavy volume.",
    failure: "A close above the engulfing candle's high cancels it.",
    example: [[62, 68, 61, 67], [69, 70, 56, 57]],
  },
  {
    slug: "piercing-line",
    name: "Piercing Line",
    short: "Piercing line",
    count: 2,
    bias: "Bullish reversal",
    points: "up",
    after: "downtrend",
    summary: "After a big red day, price opens lower but closes above the middle of that red body.",
    whatItIs:
      "Sellers gap it lower at the open, then buyers drive it back to close more than halfway into the prior day's body. A bullish engulfing's slightly weaker cousin.",
    howToSpot: [
      "Long red candle first.",
      "Second candle opens below the first's close.",
      "Second closes above the midpoint of the first body, but not above its open.",
    ],
    context: "After a clear decline. The deeper it pierces, the stronger.",
    failure: "A close below the second candle's low.",
    example: [[56, 57, 40, 41], [38, 52, 37, 51]],
  },
  {
    slug: "dark-cloud-cover",
    name: "Dark Cloud Cover",
    short: "Dark cloud",
    count: 2,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "After a big green day, price opens higher but closes below the middle of that green body.",
    whatItIs: "The mirror of the piercing line: buyers gap it up, then sellers push it more than halfway down the prior body.",
    howToSpot: [
      "Long green candle first.",
      "Second opens above the first's close.",
      "Second closes below the midpoint of the first body.",
    ],
    context: "After a clear advance, ideally at resistance.",
    failure: "A close above the second candle's high.",
    example: [[54, 71, 53, 70], [73, 74, 59, 60]],
  },
  {
    slug: "bullish-harami",
    name: "Bullish Harami",
    short: "Bull harami",
    count: 2,
    bias: "Bullish reversal",
    points: "up",
    after: "downtrend",
    summary: "A small candle inside the body of a big red one: the selling suddenly stalls.",
    whatItIs:
      "Harami means 'pregnant' in Japanese: a small body sits inside the previous large body. After a decline, the shrinking range shows the selling pressure has paused.",
    howToSpot: ["Large red candle first.", "Small second body, fully inside the first body.", "Appears after a decline."],
    context: "A pause more than a turn. It needs a strong up close next to confirm.",
    failure: "A break below the large candle's low.",
    example: [[60, 61, 41, 42], [46, 52, 45, 50]],
  },
  {
    slug: "bearish-harami",
    name: "Bearish Harami",
    short: "Bear harami",
    count: 2,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "A small candle inside the body of a big green one: the buying suddenly stalls.",
    whatItIs: "After a rally, a small body tucked inside a large green body shows the buyers' momentum fading.",
    howToSpot: ["Large green candle first.", "Small second body inside the first.", "Appears after an advance."],
    context: "Needs a lower close next to confirm.",
    failure: "A break above the large candle's high.",
    example: [[44, 63, 43, 62], [58, 59, 52, 54]],
  },
  {
    slug: "tweezer-bottom",
    name: "Tweezer Bottom",
    short: "Tweezer bottom",
    count: 2,
    bias: "Bullish reversal",
    points: "up",
    after: "downtrend",
    summary: "Two candles with matching lows: price tested the same floor twice and held.",
    whatItIs: "A down candle and an up candle that bottom at nearly the same price. The repeated low shows buyers defending a level.",
    howToSpot: ["Two lows at almost the same price.", "First candle red, second green.", "After a decline."],
    context: "Stronger when the shared low lines up with earlier support.",
    failure: "A close below the shared low.",
    example: [[48, 49, 34, 37], [37, 47, 34, 46]],
  },
  {
    slug: "tweezer-top",
    name: "Tweezer Top",
    short: "Tweezer top",
    count: 2,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "Two candles with matching highs: price hit the same ceiling twice and failed.",
    whatItIs: "An up candle and a down candle that top out at nearly the same price, showing sellers defending a level.",
    howToSpot: ["Two highs at almost the same price.", "First green, second red.", "After an advance."],
    context: "Stronger at known resistance.",
    failure: "A close above the shared high.",
    example: [[56, 70, 55, 67], [67, 70, 57, 58]],
  },
  {
    slug: "morning-star",
    name: "Morning Star",
    short: "Morning star",
    count: 3,
    bias: "Bullish reversal",
    points: "up",
    after: "downtrend",
    summary: "Big red day, a small indecisive day, then a big green day: the classic three-candle bottom.",
    whatItIs:
      "Selling, then a pause where neither side wins (the 'star'), then buyers take over and close well into the first candle's body.",
    howToSpot: [
      "Long red candle.",
      "Small-bodied candle, often gapping lower.",
      "Long green candle closing above the middle of the first.",
    ],
    context: "After a decline. More reliable than most single-candle signals.",
    failure: "A close below the star's low.",
    example: [[62, 63, 45, 46], [42, 45, 38, 43], [45, 60, 44, 59]],
  },
  {
    slug: "evening-star",
    name: "Evening Star",
    short: "Evening star",
    count: 3,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "Big green day, a small indecisive day, then a big red day: the classic three-candle top.",
    whatItIs: "The mirror of the morning star: buying, a pause at the top, then sellers take over.",
    howToSpot: [
      "Long green candle.",
      "Small-bodied candle, often gapping higher.",
      "Long red candle closing below the middle of the first.",
    ],
    context: "After an advance, especially at resistance.",
    failure: "A close above the star's high.",
    example: [[42, 60, 41, 59], [62, 66, 61, 63], [61, 62, 46, 47]],
  },
  {
    slug: "three-white-soldiers",
    name: "Three White Soldiers",
    short: "3 soldiers",
    count: 3,
    bias: "Strength",
    points: "up",
    after: "any",
    summary: "Three strong green candles in a row, each closing higher: steady, determined buying.",
    whatItIs: "Three consecutive up days with solid bodies, each opening inside the prior body and closing near its high.",
    howToSpot: ["Three green candles, each closing higher.", "Each opens within the previous body.", "Small upper wicks."],
    context: "Strongest coming out of a base or a decline.",
    failure: "After a long run it can mark exhaustion; watch for shrinking bodies.",
    example: [[30, 41, 29, 40], [37, 51, 36, 50], [47, 61, 46, 60]],
  },
  {
    slug: "three-black-crows",
    name: "Three Black Crows",
    short: "3 crows",
    count: 3,
    bias: "Bearish reversal",
    points: "down",
    after: "uptrend",
    summary: "Three strong red candles in a row, each closing lower: sellers firmly in control.",
    whatItIs: "Three consecutive down days with solid bodies, each opening inside the prior body and closing near its low.",
    howToSpot: ["Three red candles, each closing lower.", "Each opens within the previous body.", "Small lower wicks."],
    context: "Most meaningful after an advance.",
    failure: "After a long decline it can mark a selling climax instead.",
    example: [[70, 71, 59, 60], [63, 64, 49, 50], [53, 54, 39, 40]],
  },
];

export const candleBySlug = new Map(candlePatterns.map((p) => [p.slug, p]));

// ---------- detection ----------

const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => c.high - c.low || 1e-9;
const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;
const green = (c: Candle) => c.close > c.open;
const red = (c: Candle) => c.close < c.open;

function avgRange(cs: Candle[], end: number, n = 10) {
  const from = Math.max(0, end - n);
  const slice = cs.slice(from, end);
  return slice.reduce((a, c) => a + range(c), 0) / (slice.length || 1);
}

/** Trend over the 6 sessions before `start`, judged against typical candle size. */
function trendBefore(cs: Candle[], start: number): "uptrend" | "downtrend" | "flat" {
  if (start < 7) return "flat";
  const move = cs[start - 1].close - cs[start - 7].close;
  const ar = avgRange(cs, start);
  if (move > 1.5 * ar) return "uptrend";
  if (move < -1.5 * ar) return "downtrend";
  return "flat";
}

export type CandleMatch = { pattern: CandlePattern; start: number; end: number; points: Direction };

/**
 * The candle pattern that ends at index `i`, if any. Three-candle patterns win
 * over two, two over one, and a doji only counts when nothing else does.
 */
export function detectAt(cs: Candle[], i: number): CandleMatch | null {
  if (i < 1 || i >= cs.length) return null;
  const c = cs[i];
  const p = cs[i - 1];
  const q = i >= 2 ? cs[i - 2] : undefined;
  const ar = avgRange(cs, i);
  const match = (slug: string, start: number, points?: Direction): CandleMatch => {
    const pattern = candleBySlug.get(slug)!;
    return { pattern, start, end: i, points: points ?? pattern.points };
  };

  // Three candles
  if (q) {
    const t = trendBefore(cs, i - 2);
    const mid = (q.open + q.close) / 2;
    if (t === "downtrend" && red(q) && body(q) > 0.6 * ar && body(p) < 0.35 * body(q) && green(c) && c.close > mid)
      return match("morning-star", i - 2);
    if (t === "uptrend" && green(q) && body(q) > 0.6 * ar && body(p) < 0.35 * body(q) && red(c) && c.close < mid)
      return match("evening-star", i - 2);
    const soldiers = [q, p, c].every((x) => green(x) && body(x) > 0.5 * ar && upperWick(x) < 0.3 * body(x));
    if (soldiers && p.close > q.close && c.close > p.close && p.open > q.open && p.open < q.close && c.open > p.open && c.open < p.close)
      return match("three-white-soldiers", i - 2);
    const crows = [q, p, c].every((x) => red(x) && body(x) > 0.5 * ar && lowerWick(x) < 0.3 * body(x));
    if (crows && t === "uptrend" && p.close < q.close && c.close < p.close && p.open < q.open && p.open > q.close && c.open < p.open && c.open > p.close)
      return match("three-black-crows", i - 2);
  }

  // Two candles
  const t2 = trendBefore(cs, i - 1);
  if (t2 === "downtrend" && red(p) && green(c) && c.open <= p.close && c.close >= p.open && body(c) > body(p))
    return match("bullish-engulfing", i - 1);
  if (t2 === "uptrend" && green(p) && red(c) && c.open >= p.close && c.close <= p.open && body(c) > body(p))
    return match("bearish-engulfing", i - 1);
  const pMid = (p.open + p.close) / 2;
  if (t2 === "downtrend" && red(p) && body(p) > 0.6 * ar && green(c) && c.open < p.close && c.close > pMid && c.close < p.open)
    return match("piercing-line", i - 1);
  if (t2 === "uptrend" && green(p) && body(p) > 0.6 * ar && red(c) && c.open > p.close && c.close < pMid && c.close > p.open)
    return match("dark-cloud-cover", i - 1);
  const inside = Math.max(c.open, c.close) < Math.max(p.open, p.close) && Math.min(c.open, c.close) > Math.min(p.open, p.close);
  if (t2 === "downtrend" && red(p) && body(p) > 0.7 * ar && inside && body(c) < 0.5 * body(p))
    return match("bullish-harami", i - 1);
  if (t2 === "uptrend" && green(p) && body(p) > 0.7 * ar && inside && body(c) < 0.5 * body(p))
    return match("bearish-harami", i - 1);
  if (t2 === "downtrend" && red(p) && green(c) && Math.abs(p.low - c.low) < 0.08 * ar)
    return match("tweezer-bottom", i - 1);
  if (t2 === "uptrend" && green(p) && red(c) && Math.abs(p.high - c.high) < 0.08 * ar)
    return match("tweezer-top", i - 1);

  // One candle
  const t1 = trendBefore(cs, i);
  const b = body(c);
  const r = range(c);
  if (b > 0.9 * r && r > 1.3 * ar) return match("marubozu", i, green(c) ? "up" : "down");
  const hammerShape = lowerWick(c) >= 2 * b && upperWick(c) <= 0.15 * r && b > 0.03 * r;
  const starShape = upperWick(c) >= 2 * b && lowerWick(c) <= 0.15 * r && b > 0.03 * r;
  if (hammerShape && t1 === "downtrend") return match("hammer", i);
  if (hammerShape && t1 === "uptrend") return match("hanging-man", i);
  if (starShape && t1 === "downtrend") return match("inverted-hammer", i);
  if (starShape && t1 === "uptrend") return match("shooting-star", i);
  if (b <= 0.08 * r && r > 0.5 * ar && t1 !== "flat") return match("doji", i);
  return null;
}

/** Did the candle signal at the call match what happened next? */
export function candleOutcome(m: CandleMatch, actual: Direction): "worked" | "failed" | "indecision" {
  if (m.points === "sideways") return "indecision";
  return m.points === actual ? "worked" : "failed";
}

// ---------- drawing data ----------

/** Turn an idealized shape into candles, with a few context bars leading in. */
export function exampleCandles(p: CandlePattern, jitter?: () => number): Candle[] {
  const j = () => (jitter ? 0.85 + jitter() * 0.3 : 1);
  const first = p.example[0];
  const lead: Ohlc[] = [];
  // A single strong candle reads best breaking out of a quiet range.
  const flat = p.count === 1 && p.after === "any" && p.bias === "Strength";
  const dir = flat ? 0 : p.after === "downtrend" ? -1 : p.after === "uptrend" ? 1 : p.bias === "Bearish reversal" ? 1 : -1;
  // Eight context bars trending into the pattern's first open.
  let level = dir === 0 ? first[0] : first[0] - dir * 32;
  for (let k = 0; k < 8; k++) {
    const o = level;
    const c = dir === 0 ? level + (k % 2 ? -1.5 : 1.5) : level + dir * 4;
    lead.push([o, Math.max(o, c) + 2, Math.min(o, c) - 2, c]);
    level = c;
  }
  const scale = (ohlc: Ohlc): Ohlc => {
    const [o, h, l, c] = ohlc;
    const mid = (o + c) / 2;
    const s = j();
    const w = j();
    const top = Math.max(o, c);
    const bot = Math.min(o, c);
    return [mid + (o - mid) * s, top + (h - top) * w, bot - (bot - l) * w, mid + (c - mid) * s];
  };
  return [...lead, ...p.example.map(scale)].map(([o, h, l, c], i) => ({
    time: `2024-01-${String(i + 1).padStart(2, "0")}`,
    open: o,
    high: h,
    low: l,
    close: c,
    volume: 0,
  }));
}
