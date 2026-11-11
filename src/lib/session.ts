import type { Scenario } from "@/lib/market";
import { patternForTag, tagsFor } from "@/lib/patterns";

/** Charts in one sitting. No-edge waits until setup 4 or 5 of the first sitting. */
export const SESSION_SIZE = 5;

export type SetupKind = "up" | "down" | "edge" | "other";

/**
 * How a chart should be queued for a new player.
 * Clear trends are an uptrend tag whose call is higher, or a downtrend tag
 * whose call is lower, without an RSI extreme arguing the other way.
 * Practice charts have no trend tag; a continuation pattern is the clear read.
 * No edge is a sideways call.
 */
export function setupKind(s: Scenario): SetupKind {
  if (s.correct === "sideways") return "edge";
  const tags = s.tags ?? [];
  if (tags.includes("uptrend") && s.correct === "up" && !tags.includes("overbought")) return "up";
  if (tags.includes("downtrend") && s.correct === "down" && !tags.includes("oversold"))
    return "down";
  if (tags.includes("uptrend") || tags.includes("downtrend") || tags.includes("range"))
    return "other";
  const pattern = tagsFor(s).map(patternForTag).find(Boolean);
  if (pattern?.bias === "Bullish continuation" && s.correct === "up") return "up";
  if (pattern?.bias === "Bearish continuation" && s.correct === "down") return "down";
  return "other";
}

export function isClearTrend(s: Scenario): boolean {
  const kind = setupKind(s);
  return kind === "up" || kind === "down";
}

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * First sitting for a new player: three clear up/down trends, then a no-edge
 * chart at setup 4 or 5. Later charts are a normal mix.
 */
export function arrangeFirstSession(deck: Scenario[], rand: () => number = Math.random): number[] {
  const buckets: Record<SetupKind, number[]> = { up: [], down: [], edge: [], other: [] };
  deck.forEach((s, i) => buckets[setupKind(s)].push(i));
  (Object.keys(buckets) as SetupKind[]).forEach((k) => {
    buckets[k] = shuffle(buckets[k], rand);
  });

  const take = (kind: SetupKind) => buckets[kind].shift();
  const opening: number[] = [];
  const first: SetupKind =
    buckets.up.length > 0 && (buckets.down.length === 0 || rand() < 0.5) ? "up" : "down";
  const second: SetupKind = first === "up" ? "down" : "up";
  for (let n = 0; n < 3 && n < deck.length; n++) {
    const prefer = n % 2 === 0 ? first : second;
    const alt: SetupKind = prefer === "up" ? "down" : "up";
    const pick = take(prefer) ?? take(alt) ?? take("other") ?? take("edge");
    if (pick !== undefined) opening.push(pick);
  }

  const edge = take("edge");
  const filler = take("up") ?? take("down") ?? take("other") ?? take("edge");
  const noEdgeFirst = rand() < 0.5;
  const middle: number[] = [];
  const pair = noEdgeFirst ? [edge, filler] : [filler, edge];
  for (const id of pair) if (id !== undefined) middle.push(id);

  const rest = shuffle([...buckets.up, ...buckets.down, ...buckets.other, ...buckets.edge], rand);
  return [...opening, ...middle, ...rest];
}

/** Where `pos` sits inside its sitting. The last sitting of a deck may be shorter. */
export function sessionProgress(pos: number, deckLength: number): { index: number; size: number } {
  const start = Math.floor(Math.max(0, pos) / SESSION_SIZE) * SESSION_SIZE;
  const size = Math.max(1, Math.min(SESSION_SIZE, Math.max(0, deckLength - start)));
  return { index: pos - start, size };
}

export function completesSession(pos: number, deckLength: number): boolean {
  const { index, size } = sessionProgress(pos, deckLength);
  return index + 1 >= size;
}

/** One sentence about the chart itself, not the score. */
export function chartSentence(s: Scenario): string {
  if (s.source?.blurb) return firstSentence(s.source.blurb);
  const parts = s.explanation
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const useful = parts.filter(
    (p) => !/^Real daily chart\.?$/i.test(p) && !/^Over the next\b/i.test(p),
  );
  return useful[0] ?? parts[0] ?? s.explanation;
}

function firstSentence(text: string): string {
  const match = text.match(/^[\s\S]*?[.!?](?:\s|$)/);
  return (match ? match[0] : text).trim();
}
