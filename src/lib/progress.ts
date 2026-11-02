import { useSyncExternalStore } from "react";
import type { Scenario } from "@/lib/market";
import { tagsFor } from "@/lib/patterns";
import { detectAt } from "@/lib/candles";

/** Everything the player builds up, kept in this browser only. */
export type DeckId = "practice" | "real" | "review" | "moments" | "daily" | "pattern";

export type DeckStats = {
  correct: number;
  total: number;
  streak: number;
  best: number;
  /** Most recent last; true = hit. */
  recent: boolean[];
};

export type Progress = {
  version: 1;
  decks: Partial<Record<DeckId, DeckStats>>;
  byTag: Record<string, { seen: number; hit: number }>;
  /** Indicator choices: how often turning it on (or leaving it off) was right. */
  byIndicator?: Record<string, { scored: number; right: number }>;
  /** Scenario ids answered wrong and not yet fixed, oldest first. */
  misses: string[];
  /** Daily Chart streak, counted in local calendar days. */
  days: { last: string | null; count: number; best: number; freezes: number };
  /** Daily Chart results by local date. */
  daily: Record<string, boolean[]>;
};

export const TALLY = 20;
export const DAILY_SIZE = 5;
const MAX_MISSES = 60;
const MAX_FREEZES = 2;
const KEY = "cpt-progress-v1";

export const emptyDeck: DeckStats = { correct: 0, total: 0, streak: 0, best: 0, recent: [] };

const empty: Progress = {
  version: 1,
  decks: {},
  byTag: {},
  misses: [],
  days: { last: null, count: 0, best: 0, freezes: 0 },
  daily: {},
};

let state: Progress = empty;
let loaded = false;
const listeners = new Set<() => void>();

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Progress;
      if (p && p.version === 1) return { ...empty, ...p, days: { ...empty.days, ...p.days } };
    }
    // Carry over scores saved by the first version of the app.
    const decks: Progress["decks"] = {};
    for (const [id, key] of [
      ["practice", "chart-pattern-trainer-v1"],
      ["real", "chart-pattern-trainer-v1-real"],
    ] as const) {
      const old = localStorage.getItem(key);
      if (old) decks[id] = { ...emptyDeck, ...(JSON.parse(old) as Partial<DeckStats>) };
    }
    return { ...empty, decks };
  } catch {
    return empty;
  }
}

function ensure() {
  if (!loaded && typeof window !== "undefined") {
    loaded = true;
    state = load();
  }
}

function commit(next: Progress) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: progress lives for this visit only
  }
  listeners.forEach((l) => l());
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getProgress(): Progress {
  ensure();
  return state;
}

/** React hook. Renders the empty state on the server, then the saved state. */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, () => empty);
}

export function deckStats(p: Progress, deck: DeckId): DeckStats {
  return p.decks[deck] ?? emptyDeck;
}

export function recordAnswer(
  deck: DeckId,
  scenario: Scenario,
  right: boolean,
  picks: { id: string; right: boolean | null }[] = [],
) {
  ensure();
  const prev = deckStats(state, deck);
  const stats: DeckStats = {
    correct: prev.correct + (right ? 1 : 0),
    total: prev.total + 1,
    streak: right ? prev.streak + 1 : 0,
    best: right ? Math.max(prev.best, prev.streak + 1) : prev.best,
    recent: [...prev.recent, right].slice(-TALLY),
  };
  const byTag = { ...state.byTag };
  const candle = detectAt(scenario.candles, scenario.revealAt - 1);
  for (const tag of [...tagsFor(scenario), ...(candle ? [`candle:${candle.pattern.slug}`] : [])]) {
    const t = byTag[tag] ?? { seen: 0, hit: 0 };
    byTag[tag] = { seen: t.seen + 1, hit: t.hit + (right ? 1 : 0) };
  }
  const byIndicator = { ...(state.byIndicator ?? {}) };
  for (const p of picks) {
    if (p.right === null) continue;
    const t = byIndicator[p.id] ?? { scored: 0, right: 0 };
    byIndicator[p.id] = { scored: t.scored + 1, right: t.right + (p.right ? 1 : 0) };
  }
  let misses = state.misses.filter((id) => id !== scenario.id);
  if (!right) misses = [...misses, scenario.id].slice(-MAX_MISSES);
  commit({ ...state, decks: { ...state.decks, [deck]: stats }, byTag, byIndicator, misses });
}

export function resetDeck(deck: DeckId) {
  ensure();
  const decks = { ...state.decks };
  delete decks[deck];
  commit({ ...state, decks });
}

// ---------- calendar days ----------

export function dateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days from a to b, both YYYY-MM-DD. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/** Streak as it stands today: it survives one missed day per freeze. */
export function liveStreak(p: Progress, today = dateKey()): number {
  if (!p.days.last) return 0;
  const gap = daysBetween(p.days.last, today);
  return gap <= 1 + p.days.freezes ? p.days.count : 0;
}

export function recordDaily(date: string, results: boolean[]) {
  ensure();
  const daily = { ...state.daily, [date]: results };
  let days = state.days;
  if (results.length >= DAILY_SIZE && days.last !== date) {
    const gap = days.last ? daysBetween(days.last, date) : Infinity;
    let { count, freezes } = days;
    if (gap === 1) count += 1;
    else if (gap > 1 && gap - 1 <= freezes) {
      freezes -= gap - 1;
      count += 1;
    } else count = 1;
    // A freeze is earned every 7 days in a row, up to two in reserve.
    if (count % 7 === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    days = { last: date, count, best: Math.max(days.best, count), freezes };
  }
  // Keep the last 60 days of results.
  const keys = Object.keys(daily).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 60))) delete daily[k];
  commit({ ...state, daily, days });
}
