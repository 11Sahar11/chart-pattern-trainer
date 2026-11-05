export type Direction = "up" | "down" | "sideways";

export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type Guide = {
  price: number;
  title: string;
};

export type IndicatorId =
  | "sma"
  | "sma50"
  | "ema"
  | "bb"
  | "volume"
  | "obv"
  | "rsi"
  | "macd"
  | "stoch";

export type Scenario = {
  id: string;
  pattern: string;
  correct: Direction;
  revealAt: number;
  candles: Candle[];
  guides: Guide[];
  useful: IndicatorId[];
  explanation: string;
  indicatorNote: string;
  caution: string;
  /** Real-chart setups only: the ticker and dates, revealed after the call. */
  source?: {
    ticker: string;
    from: string;
    to: string;
    move: number;
    /** Famous Moments only. */
    title?: string;
    blurb?: string;
  };
  /** Stats buckets: a pattern slug for practice setups, chart conditions for real ones. */
  tags?: string[];
};

type BarSpec = {
  close: number;
  open?: number;
  volume?: number;
};

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

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function seedFrom(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Weekday dates immediately before `end` (YYYY-MM-DD), oldest first. */
function businessDaysBefore(end: string, count: number): string[] {
  const d = new Date(`${end}T00:00:00Z`);
  const out: string[] = [];
  while (out.length < count) {
    d.setUTCDate(d.getUTCDate() - 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10));
  }
  out.reverse();
  return out;
}

/**
 * Prepend plausible sessions so `revealAt` reaches `minVisible`.
 * The call, the outcome, and the existing candles stay put. Used when a lesson
 * needs a longer average than the textbook setup was drawn with.
 */
export function extendHistory(s: Scenario, minVisible: number): Scenario {
  if (minVisible <= s.revealAt || s.candles.length === 0) return s;
  const need = minVisible - s.revealAt;
  const first = s.candles[0];
  const look = Math.min(5, s.candles.length - 1);
  const later = s.candles[look].close;
  const forward = look === 0 ? 0 : (later - first.close) / look;
  const rand = mulberry32(seedFrom(s.id));
  const span = Math.max(0.25, Math.abs(first.close) * 0.004);
  const backward: Candle[] = [];
  let close = first.open;
  for (let i = 0; i < need; i++) {
    const next = close;
    const open = next - forward + (rand() - 0.5) * span;
    const top = Math.max(open, next);
    const bot = Math.min(open, next);
    const pad = Math.max(0.15, Math.abs(next - open) * 0.35 + 0.2);
    backward.push({
      time: "",
      open: round(open),
      high: round(top + pad * (0.35 + rand() * 0.9)),
      low: round(bot - pad * (0.35 + rand() * 0.9)),
      close: round(next),
      volume: Math.round((0.7 + rand() * 0.6) * 1_100_000),
    });
    close = open;
  }
  backward.reverse();
  const times = businessDaysBefore(first.time, need);
  for (let i = 0; i < backward.length; i++) {
    const c = backward[i];
    c.time = times[i];
    c.high = round(Math.max(c.high, c.open, c.close));
    c.low = round(Math.min(c.low, c.open, c.close));
  }
  return { ...s, revealAt: s.revealAt + need, candles: [...backward, ...s.candles] };
}

function businessDay(start: Date, offset: number) {
  const d = new Date(start);
  let left = offset;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return d.toISOString().slice(0, 10);
}

export function buildCandles(specs: BarSpec[], seed: number): Candle[] {
  const rand = mulberry32(seed);
  const start = new Date(Date.UTC(2023, 2, 1));
  let prevClose = specs[0]?.close ?? 100;
  return specs.map((spec, i) => {
    const open = spec.open ?? (i === 0 ? spec.close - 0.35 : prevClose);
    const close = spec.close;
    const body = Math.abs(close - open);
    const base = Math.max(0.45, body * 0.35 + 0.35);
    const high = Math.max(open, close) + base * (0.35 + rand() * 0.9);
    const low = Math.min(open, close) - base * (0.35 + rand() * 0.9);
    const volume = spec.volume ?? Math.round((0.7 + rand() * 0.7) * 1_350_000);
    prevClose = close;
    return {
      time: businessDay(start, i),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
    };
  });
}

export function swing(
  points: [number, number][],
  seed: number,
  amp = 0.22,
  spikes: number[] = [],
): BarSpec[] {
  const rand = mulberry32(seed);
  const last = points[points.length - 1][0];
  const knots = new Set(points.map((p) => p[0]));
  const specs: BarSpec[] = [];
  for (let i = 0; i <= last; i++) {
    let a = points[0];
    let b = points[1];
    for (let k = 0; k < points.length - 1; k++) {
      if (i >= points[k][0] && i <= points[k + 1][0]) {
        a = points[k];
        b = points[k + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const t = (i - a[0]) / span;
    const base = a[1] + (b[1] - a[1]) * t;
    const close = knots.has(i) ? base : base + (rand() - 0.5) * amp * 2;
    const hot = spikes.some((s) => Math.abs(s - i) <= 1);
    const volume = Math.round((hot ? 2.6 : 0.85 + rand() * 0.45) * 1_200_000);
    specs.push({ close: round(close), volume });
  }
  return specs;
}

export function sma(candles: Candle[], period: number) {
  const out: { time: string; value: number }[] = [];
  let sum = 0;
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) sum -= candles[i - period].close;
    if (i >= period - 1) out.push({ time: candles[i].time, value: round(sum / period) });
  }
  return out;
}

export function ema(candles: Candle[], period: number) {
  const out: { time: string; value: number }[] = [];
  if (candles.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += candles[i].close;
  let prev = sum / period;
  const k = 2 / (period + 1);
  out.push({ time: candles[period - 1].time, value: round(prev) });
  for (let i = period; i < candles.length; i++) {
    prev = candles[i].close * k + prev * (1 - k);
    out.push({ time: candles[i].time, value: round(prev) });
  }
  return out;
}

export function rsi(candles: Candle[], period = 14) {
  const out: { time: string; value: number }[] = [];
  if (candles.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  const valueAt = (g: number, l: number) => (l === 0 ? 100 : 100 - 100 / (1 + g / l));
  out.push({ time: candles[period].time, value: round(valueAt(avgGain, avgLoss)) });
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const g = diff > 0 ? diff : 0;
    const l = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out.push({ time: candles[i].time, value: round(valueAt(avgGain, avgLoss)) });
  }
  return out;
}

export function drift(candles: Candle[], from: number): Direction {
  const start = candles[from - 1]?.close;
  const end = candles[candles.length - 1]?.close;
  if (start == null || end == null) return "sideways";
  const change = (end - start) / start;
  if (change > 0.025) return "up";
  if (change < -0.025) return "down";
  return "sideways";
}

export type Point = { time: string; value: number };

/** Bollinger Bands: 20-day SMA with bands two standard deviations away. */
export function bollinger(candles: Candle[], period = 20, k = 2) {
  const upper: Point[] = [];
  const middle: Point[] = [];
  const lower: Point[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += candles[j].close;
    const mean = sum / period;
    let sq = 0;
    for (let j = i - period + 1; j <= i; j++) sq += (candles[j].close - mean) ** 2;
    const sd = Math.sqrt(sq / period);
    const time = candles[i].time;
    upper.push({ time, value: round(mean + k * sd) });
    middle.push({ time, value: round(mean) });
    lower.push({ time, value: round(mean - k * sd) });
  }
  return { upper, middle, lower };
}

function emaValues(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (values.length < period) return out;
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** MACD 12/26/9: line, signal and histogram. */
export function macd(candles: Candle[]) {
  const closes = candles.map((c) => c.close);
  const fast = emaValues(closes, 12);
  const slow = emaValues(closes, 26);
  const lineIdx: number[] = [];
  const lineVals: number[] = [];
  closes.forEach((_, i) => {
    if (fast[i] != null && slow[i] != null) {
      lineIdx.push(i);
      lineVals.push((fast[i] as number) - (slow[i] as number));
    }
  });
  const sig = emaValues(lineVals, 9);
  const line: Point[] = [];
  const signal: Point[] = [];
  const hist: Point[] = [];
  lineIdx.forEach((ci, j) => {
    const time = candles[ci].time;
    line.push({ time, value: round(lineVals[j]) });
    if (sig[j] != null) {
      signal.push({ time, value: round(sig[j] as number) });
      hist.push({ time, value: round(lineVals[j] - (sig[j] as number)) });
    }
  });
  return { line, signal, hist };
}

/** Slow stochastic 14/3: %K and its 3-day average %D. */
export function stochastic(candles: Candle[], period = 14, smooth = 3) {
  const raw: { time: string; v: number }[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, candles[j].high);
      lo = Math.min(lo, candles[j].low);
    }
    raw.push({ time: candles[i].time, v: hi === lo ? 50 : ((candles[i].close - lo) / (hi - lo)) * 100 });
  }
  const k: Point[] = [];
  for (let i = smooth - 1; i < raw.length; i++) {
    let s = 0;
    for (let j = i - smooth + 1; j <= i; j++) s += raw[j].v;
    k.push({ time: raw[i].time, value: round(s / smooth) });
  }
  const d: Point[] = [];
  for (let i = smooth - 1; i < k.length; i++) {
    let s = 0;
    for (let j = i - smooth + 1; j <= i; j++) s += k[j].value;
    d.push({ time: k[i].time, value: round(s / smooth) });
  }
  return { k, d };
}

/** On-balance volume: running total of volume, added on up days and subtracted on down days. */
export function obv(candles: Candle[]): Point[] {
  const out: Point[] = [];
  let total = 0;
  candles.forEach((c, i) => {
    if (i > 0) {
      if (c.close > candles[i - 1].close) total += c.volume;
      else if (c.close < candles[i - 1].close) total -= c.volume;
    }
    out.push({ time: c.time, value: total });
  });
  return out;
}
