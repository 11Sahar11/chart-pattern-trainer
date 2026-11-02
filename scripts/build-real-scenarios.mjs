#!/usr/bin/env node
// Builds src/data/real-scenarios.json from real daily candles on Yahoo Finance.
//
//   npm run data:yahoo                 -> default tickers, 10 years, 8 windows per ticker
//   npm run data:yahoo -- --per=12     -> more windows per ticker
//   npm run data:yahoo -- --tickers=AAPL,MSFT,TSLA
//   npm run data:yahoo -- --mock       -> random-walk data, no network (for testing)
//
// Each scenario is a 60-candle window that stops before the move, plus 20 candles
// of what really happened next. Prices are rebased to 100 and dates are replaced,
// so the chart cannot be recognized. The real ticker and dates are kept in `source`
// and shown only after the player commits.
//
// Yahoo data is for personal and educational use. Check the license before
// shipping this data in a commercial product.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, "../src/data/real-scenarios.json");

const DEFAULT_TICKERS = [
  // US large caps across sectors
  "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "XOM", "JNJ",
  "WMT", "KO", "PFE", "BA", "DIS", "NFLX", "AMD", "INTC", "CAT", "NKE",
  // Indexes and ETFs
  "SPY", "QQQ", "IWM", "GLD", "XLE",
  // Israeli names traded in the US
  "TEVA", "CHKP", "NICE", "WIX", "MNDY",
];

const CONTEXT = 60; // candles shown before the call
const FORWARD = 20; // candles revealed after the call
const MIN_GAP = CONTEXT + FORWARD; // windows from one ticker never overlap

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const tickers = args.tickers ? args.tickers.split(",").map((t) => t.trim().toUpperCase()) : DEFAULT_TICKERS;
const perTicker = Number(args.per ?? 8);
const range = args.range ?? "10y";
const mock = args.mock === "true";
const seed = Number(args.seed ?? 7);

// ---------- helpers ----------

function mulberry32(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(seed);
const round = (n) => Math.round(n * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (n) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

function businessDays(count) {
  const d = new Date(Date.UTC(2023, 2, 1));
  const out = [];
  while (out.length < count) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function smaAt(closes, i, p) {
  if (i < p - 1) return null;
  let s = 0;
  for (let k = i - p + 1; k <= i; k++) s += closes[k];
  return s / p;
}

function emaAt(closes, i, p) {
  if (i < p - 1) return null;
  let prev = closes.slice(0, p).reduce((a, b) => a + b, 0) / p;
  const k = 2 / (p + 1);
  for (let j = p; j <= i; j++) prev = closes[j] * k + prev * (1 - k);
  return prev;
}

function rsiAt(closes, i, p = 14) {
  if (i <= p) return null;
  let g = 0;
  let l = 0;
  for (let j = 1; j <= p; j++) {
    const d = closes[j] - closes[j - 1];
    if (d >= 0) g += d;
    else l -= d;
  }
  let ag = g / p;
  let al = l / p;
  for (let j = p + 1; j <= i; j++) {
    const d = closes[j] - closes[j - 1];
    ag = (ag * (p - 1) + Math.max(d, 0)) / p;
    al = (al * (p - 1) + Math.max(-d, 0)) / p;
  }
  return al === 0 ? 100 : 100 - 100 / (1 + ag / al);
}

// ---------- data ----------

async function fetchYahoo(ticker, window) {
  const span = window
    ? `period1=${Math.floor(window.from / 1000)}&period2=${Math.floor(window.to / 1000)}`
    : `range=${range}`;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?${span}&interval=1d&events=split,div`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (chart-pattern-trainer data script)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const r = json?.chart?.result?.[0];
  if (!r) throw new Error(json?.chart?.error?.description ?? "empty response");
  const q = r.indicators.quote[0];
  // adjclose keeps splits from showing up as fake crashes
  const adj = r.indicators.adjclose?.[0]?.adjclose;
  const bars = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const { open, high, low, close, volume } = {
      open: q.open[i], high: q.high[i], low: q.low[i], close: q.close[i], volume: q.volume[i],
    };
    if ([open, high, low, close].some((v) => v == null || !Number.isFinite(v)) || !close) continue;
    const f = adj?.[i] ? adj[i] / close : 1;
    bars.push({
      date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
      open: open * f, high: high * f, low: low * f, close: close * f,
      volume: volume ?? 0,
    });
  }
  return bars;
}

function mockSeries(ticker) {
  const r = mulberry32([...ticker].reduce((a, c) => a * 31 + c.charCodeAt(0), 1));
  const bars = [];
  let price = 50 + r() * 150;
  let drift = 0;
  const d = new Date(Date.UTC(2016, 0, 4));
  for (let i = 0; i < 2500; i++) {
    if (i % 40 === 0) drift = (r() - 0.5) * 0.004;
    const ret = drift + (r() - 0.5) * 0.035;
    const open = price;
    price = Math.max(1, price * (1 + ret));
    bars.push({
      date: d.toISOString().slice(0, 10),
      open, close: price,
      high: Math.max(open, price) * (1 + r() * 0.01),
      low: Math.min(open, price) * (1 - r() * 0.01),
      volume: Math.round(1e6 * (0.6 + r() + Math.abs(ret) * 30)),
    });
    d.setUTCDate(d.getUTCDate() + (d.getUTCDay() === 5 ? 3 : 1));
  }
  return bars;
}

// ---------- scenario building ----------

function pickStarts(n) {
  const slots = [];
  for (let s = 30; s + MIN_GAP <= n; s += MIN_GAP) slots.push(s); // 30 bars warm-up
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots.slice(0, perTicker);
}

function buildScenario(ticker, bars, start, n) {
  const win = bars.slice(start, start + MIN_GAP);
  // Indicators are computed with 30 bars of history so SMA/RSI are warm at the cut.
  const warm = bars.slice(start - 30, start + MIN_GAP).map((b) => b.close);
  const cutW = 30 + CONTEXT - 1; // index of the last visible candle inside `warm`

  const scale = 100 / win[0].close;
  const volScale = 1_000_000 / (win.slice(0, CONTEXT).reduce((a, b) => a + b.volume, 0) / CONTEXT || 1);
  const dates = businessDays(MIN_GAP);
  const candles = win.map((b, i) => ({
    time: dates[i],
    open: round(b.open * scale),
    high: round(b.high * scale),
    low: round(b.low * scale),
    close: round(b.close * scale),
    volume: Math.round(b.volume * volScale),
  }));

  // Outcome: move over the next 20 sessions vs. this window's own volatility.
  const before = win[CONTEXT - 1].close;
  const after = win[MIN_GAP - 1].close;
  const move = after / before - 1;
  const rets = [];
  for (let i = 1; i < CONTEXT; i++) rets.push(win[i].close / win[i - 1].close - 1);
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);
  const threshold = Math.max(0.03, sd * Math.sqrt(FORWARD) * 0.6);
  const correct = move > threshold ? "up" : move < -threshold ? "down" : "sideways";

  // What each indicator said at the cut, and whether it agreed with the outcome.
  const price = warm[cutW];
  const s20 = smaAt(warm, cutW, 20);
  const s20prev = smaAt(warm, cutW - 5, 20);
  const e12 = emaAt(warm, cutW, 12);
  const r14 = rsiAt(warm, cutW, 14);
  const last5 = win.slice(CONTEXT - 5, CONTEXT);
  const prior20 = win.slice(CONTEXT - 25, CONTEXT - 5);
  const volRatio =
    last5.reduce((a, b) => a + b.volume, 0) / 5 / (prior20.reduce((a, b) => a + b.volume, 0) / 20 || 1);
  const push5 = win[CONTEXT - 1].close / win[CONTEXT - 6].close - 1;

  const reads = {
    sma: price > s20 && s20 > s20prev ? "up" : price < s20 && s20 < s20prev ? "down" : "sideways",
    ema: price > e12 * 1.01 ? "up" : price < e12 * 0.99 ? "down" : "sideways",
    rsi: r14 >= 70 ? "down" : r14 <= 30 ? "up" : r14 > 55 ? "up" : r14 < 45 ? "down" : "sideways",
    volume: volRatio > 1.3 ? (push5 > 0 ? "up" : "down") : "sideways",
  };
  const readText = {
    sma: `price ${price > s20 ? "above" : "below"} a ${s20 > s20prev ? "rising" : "falling"} SMA 20`,
    ema: `price ${pct(price / e12 - 1)} from EMA 12`,
    rsi: `RSI at ${r14.toFixed(0)}${r14 >= 70 ? " (overbought)" : r14 <= 30 ? " (oversold)" : ""}`,
    volume: `volume ${volRatio.toFixed(1)}x its recent average${volRatio > 1.3 ? (push5 > 0 ? " on a push up" : " on a push down") : ""}`,
  };
  const useful = Object.keys(reads).filter((k) => reads[k] === correct);
  const misled = Object.keys(reads).filter((k) => reads[k] !== correct && reads[k] !== "sideways");

  const trend = before / win[0].close - 1;
  const dirWord = { up: "higher", down: "lower", sideways: "sideways" }[correct];
  const explanation =
    `Real daily chart. Into the marker the stock had moved ${pct(trend)} over ${CONTEXT} sessions. ` +
    `Over the next ${FORWARD} sessions it went ${pct(move)}, so the answer is ${dirWord} ` +
    `(this chart needed more than ±${(threshold * 100).toFixed(1)}% to count as a move, based on its own volatility).`;

  const indicatorNote =
    (useful.length
      ? `Agreed with the outcome: ${useful.map((k) => readText[k]).join("; ")}.`
      : "No indicator pointed the right way at the marker.") +
    (misled.length ? ` Pointed the wrong way: ${misled.map((k) => readText[k]).join("; ")}.` : "");

  const caution =
    correct === "sideways"
      ? "Most real charts do not resolve cleanly. Calling no edge is a real answer."
      : misled.length
        ? "Indicators disagreed here. Real tape rarely lines up as neatly as textbook patterns."
        : "One clean read is not a system. Track how often the same read works across many charts.";

  // Stats buckets: the trend into the call and what momentum and volume looked like.
  const tags = [trend > 0.08 ? "uptrend" : trend < -0.08 ? "downtrend" : "range"];
  if (r14 >= 70) tags.push("overbought");
  if (r14 <= 30) tags.push("oversold");
  if (volRatio > 1.8) tags.push("volume-spike");

  return {
    id: `${ticker}-${win[0].date}`,
    tags,
    pattern: `${ticker} · ${win[0].date} → ${win[MIN_GAP - 1].date}`,
    correct,
    revealAt: CONTEXT,
    candles,
    guides: [{ price: round(before * scale), title: "Price at the call" }],
    useful,
    explanation,
    indicatorNote,
    caution,
    source: { ticker, from: win[0].date, to: win[MIN_GAP - 1].date, move: round(move * 100) },
  };
}

// ---------- famous moments ----------

// Calls are made at the close of `call` (or the last session before it).
const MOMENTS = [
  { pack: "crashes", ticker: "QQQ", call: "2000-03-10", title: "The dot-com peak",
    blurb: "March 2000: tech stocks had gone nearly vertical. The Nasdaq peaked that week and went on to lose most of its value over the next two and a half years." },
  { pack: "crashes", ticker: "SPY", call: "2008-09-12", title: "The Lehman weekend",
    blurb: "Friday, September 12, 2008. Over that weekend Lehman Brothers failed, and the financial crisis went from bad to historic." },
  { pack: "crashes", ticker: "SPY", call: "2020-02-21", title: "The COVID crash",
    blurb: "February 2020: the S&P 500 sat near record highs while the virus spread outside China. Within a month it had fallen about a third, the fastest drop of that size on record." },
  { pack: "crashes", ticker: "SPY", call: "2022-01-03", title: "The 2022 top",
    blurb: "The first trading day of 2022 marked the S&P 500's high as inflation surged and the Fed turned to rate hikes. A bear market followed." },
  { pack: "manias", ticker: "GME", call: "2021-01-12", title: "The GameStop squeeze",
    blurb: "January 2021: retail traders on Reddit piled into a heavily shorted video game retailer. What came next became one of the most famous short squeezes ever." },
  { pack: "manias", ticker: "AMC", call: "2021-05-25", title: "AMC, round two",
    blurb: "Late May 2021: the meme-stock crowd turned back to the movie theater chain, and it ran far beyond anything its business justified." },
  { pack: "manias", ticker: "BTC-USD", call: "2017-12-15", title: "Bitcoin's 2017 top",
    blurb: "December 2017: Bitcoin was everywhere, approaching $20,000 after a year-long mania. It peaked within days and spent the next year falling." },
  { pack: "manias", ticker: "TSLA", call: "2020-11-16", title: "Tesla joins the S&P 500",
    blurb: "After the close on November 16, 2020, S&P announced Tesla would join the index, forcing index funds to buy billions of dollars of the stock." },
  { pack: "shocks", ticker: "META", call: "2022-02-02", title: "Meta's earnings collapse",
    blurb: "After the close on February 2, 2022, Meta reported its first-ever drop in daily users. The next day erased more market value than any single day in US history at the time." },
  { pack: "shocks", ticker: "NVDA", call: "2023-05-24", title: "NVIDIA's AI guidance",
    blurb: "After the close on May 24, 2023, NVIDIA guided revenue far above expectations on demand for AI chips. The stock gapped up the next morning." },
  { pack: "shocks", ticker: "NFLX", call: "2022-04-19", title: "Netflix loses subscribers",
    blurb: "After the close on April 19, 2022, Netflix reported its first subscriber loss in over a decade. The stock fell by more than a third the next day." },
  { pack: "shocks", ticker: "AAPL", call: "2020-03-20", title: "Apple at the COVID low",
    blurb: "March 2020: panic selling hit everything. The market bottomed days later, and Apple led a recovery few saw coming." },
];

async function buildMoment(m) {
  const callMs = Date.parse(`${m.call}T23:59:59Z`);
  const day = 86_400_000;
  const bars = mock
    ? mockSeries(m.ticker)
    : await fetchYahoo(m.ticker, { from: callMs - 200 * day, to: callMs + 60 * day });
  let c = mock ? 600 : bars.findLastIndex((b) => b.date <= m.call);
  const start = c - CONTEXT + 1;
  if (c < 0 || start < 30 || c + FORWARD >= bars.length) throw new Error(`not enough data around ${m.call}`);
  const sc = buildScenario(m.ticker, bars, start, bars.length);
  return {
    ...sc,
    id: `moment-${m.ticker}-${m.call}`,
    pack: m.pack,
    pattern: m.title,
    tags: ["moment", ...sc.tags],
    source: { ...sc.source, title: m.title, blurb: m.blurb },
  };
}

// ---------- main ----------

const scenarios = [];
const failed = [];
for (const ticker of tickers) {
  try {
    const bars = mock ? mockSeries(ticker) : await fetchYahoo(ticker);
    if (bars.length < MIN_GAP + 30) throw new Error(`only ${bars.length} bars`);
    const starts = pickStarts(bars.length);
    for (const s of starts) scenarios.push(buildScenario(ticker, bars, s, bars.length));
    console.log(`✓ ${ticker.padEnd(6)} ${bars.length} bars → ${starts.length} setups`);
  } catch (err) {
    failed.push(ticker);
    console.warn(`✗ ${ticker.padEnd(6)} ${err.message}`);
  }
  if (!mock) await sleep(400);
}

// Shuffle so one ticker does not come in a row.
for (let i = scenarios.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [scenarios[i], scenarios[j]] = [scenarios[j], scenarios[i]];
}

const moments = [];
if (!args.tickers) {
  for (const m of MOMENTS) {
    try {
      moments.push(await buildMoment(m));
      console.log(`✓ moment  ${m.title}`);
    } catch (err) {
      console.warn(`✗ moment  ${m.title}: ${err.message}`);
    }
    if (!mock) await sleep(400);
  }
  if (moments.length) {
    await writeFile(resolve(here, "../src/data/moments.json"), JSON.stringify(moments));
    console.log(`Wrote ${moments.length} Famous Moments to src/data/moments.json`);
  }
}

if (!scenarios.length) {
  console.error("\nNo setups built, so the existing data file was left as it is.");
  console.error("Check your internet connection, or try again in a few minutes (Yahoo sometimes rate-limits).");
  process.exit(1);
}

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(scenarios));

const count = (d) => scenarios.filter((s) => s.correct === d).length;
console.log(
  `\nWrote ${scenarios.length} setups to src/data/real-scenarios.json` +
    `  (up ${count("up")} · down ${count("down")} · no edge ${count("sideways")})`,
);
if (failed.length) console.log(`Skipped: ${failed.join(", ")}`);
if (!scenarios.length) process.exitCode = 1;
