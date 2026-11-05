import type { Direction, Scenario } from "@/lib/market";
import { DAILY_SIZE } from "@/lib/progress";
import { realScenarios } from "@/lib/real-scenarios";
import { scenarios as practiceScenarios } from "@/lib/scenarios";

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

function shuffle<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** One of each call, then the extras. Rotated by day so the order is not frozen. */
const MIX: Direction[] = ["up", "down", "sideways", "up", "down"];

/**
 * The same five charts for every player on a given day.
 * The set always includes a no-edge chart when the pool has one, so "no edge"
 * can be the right call. Practice no-edge setups fill in if the real deck has none.
 */
export function buildDailySet(dayNumber: number): Scenario[] {
  const base =
    realScenarios.length >= 30 ? realScenarios : [...practiceScenarios, ...realScenarios];
  const haveSideways = base.some((s) => s.correct === "sideways");
  const pool = haveSideways
    ? base
    : [
        ...base,
        ...practiceScenarios.filter(
          (s) => s.correct === "sideways" && !base.some((p) => p.id === s.id),
        ),
      ];
  const rand = mulberry32(dayNumber * 2654435761);
  const buckets: Record<Direction, Scenario[]> = {
    up: shuffle(
      pool.filter((s) => s.correct === "up"),
      rand,
    ),
    down: shuffle(
      pool.filter((s) => s.correct === "down"),
      rand,
    ),
    sideways: shuffle(
      pool.filter((s) => s.correct === "sideways"),
      rand,
    ),
  };
  const rot = dayNumber % MIX.length;
  const order = [...MIX.slice(rot), ...MIX.slice(0, rot)];
  const used = new Set<string>();
  const picked: Scenario[] = [];
  const take = (dir: Direction) => {
    const preferred = buckets[dir].length ? buckets[dir] : shuffle(pool, rand);
    const next = preferred.find((s) => !used.has(s.id));
    if (!next) return;
    used.add(next.id);
    picked.push(next);
  };
  for (const dir of order) take(dir);
  if (picked.length < DAILY_SIZE) {
    for (const s of shuffle(pool, rand)) {
      if (picked.length >= DAILY_SIZE) break;
      if (used.has(s.id)) continue;
      used.add(s.id);
      picked.push(s);
    }
  }
  return picked.slice(0, DAILY_SIZE);
}
