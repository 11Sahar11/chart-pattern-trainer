import type { Scenario } from "@/lib/market";
import { patterns } from "@/lib/patterns";
import { getProgress, type Progress } from "@/lib/progress";

const biasById = new Map(patterns.map((p) => [p.scenarioId, p.bias]));
const FIRST_KEY = "cpt-first-session";

/** Charts in one sitting before the Daily pointer. */
export const SESSION_SIZE = 8;
/** No-edge charts stay out until this index (setup 4). */
export const NO_EDGE_FROM = 3;

export type DeckState = {
  order: number[];
  pos: number;
  /** Parallel to `order`. Null until that chart is called. */
  hits: (boolean | null)[];
  /** A session break at this position was already dismissed. */
  ack: number;
};

export function isNoEdge(s: Scenario): boolean {
  return s.correct === "sideways";
}

/** Trend and outcome agree, with no mixed momentum tag. */
export function isObviousUp(s: Scenario): boolean {
  if (s.correct !== "up") return false;
  const tags = s.tags ?? [];
  if (tags.includes("uptrend")) return !tags.includes("overbought") && !tags.includes("oversold") && !tags.includes("range");
  if (tags.includes("downtrend") || tags.includes("range")) return false;
  return biasById.get(s.id) === "Bullish continuation";
}

export function isObviousDown(s: Scenario): boolean {
  if (s.correct !== "down") return false;
  const tags = s.tags ?? [];
  if (tags.includes("downtrend")) return !tags.includes("overbought") && !tags.includes("oversold") && !tags.includes("range");
  if (tags.includes("uptrend") || tags.includes("range")) return false;
  return biasById.get(s.id) === "Bearish continuation";
}

function shuffle(items: number[], rand: () => number): number[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const left = a[i];
    const right = a[j];
    if (left === undefined || right === undefined) continue;
    a[i] = right;
    a[j] = left;
  }
  return a;
}

/**
 * First sitting: obvious uptrends and downtrends, then a no-edge chart
 * at setup 4, then everything else. Later sittings use a plain shuffle.
 */
export function easyFirstOrder(scenarios: readonly Scenario[], rand: () => number = Math.random): number[] {
  const up: number[] = [];
  const down: number[] = [];
  const other: number[] = [];
  const none: number[] = [];
  scenarios.forEach((s, i) => {
    if (isNoEdge(s)) none.push(i);
    else if (isObviousUp(s)) up.push(i);
    else if (isObviousDown(s)) down.push(i);
    else other.push(i);
  });
  const ups = shuffle(up, rand);
  const downs = shuffle(down, rand);
  const others = shuffle(other, rand);
  const nones = shuffle(none, rand);

  const lead: number[] = [];
  let wantUp = true;
  while (lead.length < Math.min(NO_EDGE_FROM, scenarios.length)) {
    const primary = wantUp ? ups : downs;
    const secondary = wantUp ? downs : ups;
    const next = primary.shift() ?? secondary.shift() ?? others.shift();
    if (next === undefined) break;
    lead.push(next);
    wantUp = !wantUp;
  }

  const rest = [...ups, ...downs, ...others, ...nones];
  let pinned: number | undefined;
  if (lead.length >= NO_EDGE_FROM && nones.length > 0) {
    pinned = nones[0];
    const at = rest.indexOf(pinned);
    if (at >= 0) rest.splice(at, 1);
  }
  const tail = shuffle(rest, rand);
  const order = pinned === undefined ? [...lead, ...tail] : [...lead, pinned, ...tail];
  const seen = new Set(order);
  for (let i = 0; i < scenarios.length; i++) if (!seen.has(i)) order.push(i);
  return order;
}

export function shuffledOrder(n: number, rand: () => number = Math.random, avoidFirst?: number): number[] {
  const order = shuffle(
    Array.from({ length: n }, (_, i) => i),
    rand,
  );
  if (n > 1 && order[0] === avoidFirst) {
    const swap = order[1];
    if (swap !== undefined) {
      order[1] = order[0];
      order[0] = swap;
    }
  }
  return order;
}

export function freshOrder(
  scenarios: readonly Scenario[],
  first: boolean,
  rand: () => number = Math.random,
  avoidFirst?: number,
): DeckState {
  return {
    order: first ? easyFirstOrder(scenarios, rand) : shuffledOrder(scenarios.length, rand, avoidFirst),
    pos: 0,
    hits: [],
    ack: 0,
  };
}

export function advance(d: DeckState): DeckState {
  if (d.pos + 1 < d.order.length) return { ...d, pos: d.pos + 1 };
  return { ...d, pos: d.order.length };
}

/** Hits for the sitting that just finished. `pos` is the first chart of the next sitting, or the deck length. */
export function finishedSessionHits(d: DeckState): boolean[] {
  const end = d.pos;
  const span = end % SESSION_SIZE === 0 ? Math.min(SESSION_SIZE, end) : end % SESSION_SIZE;
  return d.hits.slice(end - span, end).filter((hit): hit is boolean => hit != null);
}

export function atSessionBreak(d: DeckState): boolean {
  if (d.ack === d.pos) return false;
  const boundary = (d.pos === d.order.length && d.pos > 0) || (d.pos > 0 && d.pos % SESSION_SIZE === 0);
  return boundary && finishedSessionHits(d).length > 0;
}

export function continueSession(d: DeckState, scenarios: readonly Scenario[], rand: () => number = Math.random): DeckState {
  if (d.pos >= d.order.length) {
    return freshOrder(scenarios, false, rand, d.order[d.order.length - 1]);
  }
  return { ...d, ack: d.pos };
}

export function playingLabel(pos: number, length: number): string {
  const start = Math.floor(pos / SESSION_SIZE) * SESSION_SIZE;
  const of = Math.min(SESSION_SIZE, length - start);
  return `Setup ${pos - start + 1} of ${of}`;
}

export function parseOrder(raw: string | null, size: number): DeckState | null {
  if (!raw || size <= 0) return null;
  try {
    const p = JSON.parse(raw) as Partial<DeckState> & { order?: unknown; hits?: unknown };
    if (!p || !Array.isArray(p.order) || p.order.length !== size) return null;
    if (typeof p.pos !== "number" || p.pos < 0 || p.pos > size) return null;
    if (!p.order.every((n) => typeof n === "number" && n >= 0 && n < size)) return null;
    const hadHits = Array.isArray(p.hits);
    const hits = hadHits ? (p.hits as (boolean | null)[]) : [];
    let ack = typeof p.ack === "number" ? p.ack : 0;
    const state: DeckState = { order: p.order as number[], pos: p.pos, hits, ack };
    // Orders saved before sittings existed should not pop a break mid-pass.
    if (!hadHits && atSessionBreak({ ...state, ack: 0 })) ack = p.pos;
    return { ...state, ack };
  } catch {
    return null;
  }
}

export function firstSessionDone(): boolean {
  try {
    return localStorage.getItem(FIRST_KEY) === "done";
  } catch {
    return false;
  }
}

/** Remember that this sitting is the easy one, so hints stay up after the first call. */
export function markFirstSessionActive() {
  try {
    if (localStorage.getItem(FIRST_KEY) !== "done") localStorage.setItem(FIRST_KEY, "active");
  } catch {
    // hints may drop after the first call
  }
}

export function markFirstSessionDone() {
  try {
    localStorage.setItem(FIRST_KEY, "done");
  } catch {
    // the next visit may show the easy order again
  }
}

/**
 * True for the sitting that opens on clear trends.
 * Stays true after the first call, until that sitting ends.
 * A player who already has calls, and no active flag, is past it.
 */
export function inFirstSession(progress: Progress = getProgress()): boolean {
  if (typeof window === "undefined") return false;
  try {
    const flag = localStorage.getItem(FIRST_KEY);
    if (flag === "done") return false;
    if (flag === "active") return true;
  } catch {
    return false;
  }
  const answered = (["practice", "real", "review"] as const).reduce((n, id) => n + (progress.decks[id]?.total ?? 0), 0);
  return answered === 0;
}
