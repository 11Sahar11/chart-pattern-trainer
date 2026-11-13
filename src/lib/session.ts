import type { Scenario } from "@/lib/market";

/**
 * A new player's first five practice charts, in this order.
 * Slots 4 and 5 are a range and a plain reversal, never a trap or a divergence.
 */
export const FIRST_SESSION_IDS = [
  "bull-flag",
  "desc-tri",
  "asc-tri",
  "range-box",
  "double-top",
] as const;

/** Practice and Real charts wait this many calls, or the last chart of the deck. */
export const RECAP_EVERY = 10;

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fixed opening, then the rest of the deck.
 * The first five ids are never shuffled. Anything held back cannot land in them.
 */
export function arrangeFirstSession(deck: Scenario[], rand: () => number = Math.random): number[] {
  const indexById = new Map(deck.map((s, i) => [s.id, i]));
  const head: number[] = [];
  for (const id of FIRST_SESSION_IDS) {
    const i = indexById.get(id);
    if (i !== undefined) head.push(i);
  }
  const used = new Set(head);
  const rest = shuffle(
    deck.map((_, i) => i).filter((i) => !used.has(i)),
    rand,
  );
  return [...head, ...rest];
}

/** Answers already recorded in the current block of up to {@link RECAP_EVERY}. */
export function answersIntoBlock(pos: number): number {
  if (pos < 0) return 0;
  return pos % RECAP_EVERY;
}

/**
 * Practice only uses this. True on the 10th, 20th, … call, and on the last
 * chart of the deck. A 5th call is still mid-round.
 */
export function completesSession(pos: number, deckLength: number): boolean {
  if (deckLength <= 0 || pos < 0 || pos >= deckLength) return false;
  const finished = pos + 1;
  return finished >= deckLength || finished % RECAP_EVERY === 0;
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
