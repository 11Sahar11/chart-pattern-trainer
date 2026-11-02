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

export type IndicatorId = "sma" | "ema" | "volume" | "rsi";

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
