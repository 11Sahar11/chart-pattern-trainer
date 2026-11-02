import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, RotateCcw } from "lucide-react";
import { Drill, Stat, Tally } from "@/components/drill";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios, scenarioById } from "@/lib/real-scenarios";
import type { Scenario } from "@/lib/market";
import {
  DAILY_SIZE,
  TALLY,
  dateKey,
  deckStats,
  getProgress,
  liveStreak,
  resetDeck,
  useProgress,
} from "@/lib/progress";

type Mode = "practice" | "real" | "review";
const MODE_KEY = "cpt-mode";

/** A shuffled pass through a deck, so the same setup never comes up twice in a row. */
type DeckState = { order: number[]; pos: number };
const orderKey = (mode: Mode) => `cpt-order-${mode}`;

function shuffled(n: number, avoidFirst?: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n > 1 && a[0] === avoidFirst) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

function loadOrder(mode: Mode, size: number): DeckState {
  try {
    const p = JSON.parse(localStorage.getItem(orderKey(mode)) ?? "null") as DeckState | null;
    if (p && Array.isArray(p.order) && p.order.length === size && p.pos >= 0 && p.pos < size) return p;
  } catch {
    // fresh shuffle
  }
  return { order: shuffled(size), pos: 0 };
}

function saveOrder(mode: Mode, d: DeckState) {
  try {
    localStorage.setItem(orderKey(mode), JSON.stringify(d));
  } catch {
    // ignore
  }
}

function advance(d: DeckState): DeckState {
  if (d.pos + 1 < d.order.length) return { order: d.order, pos: d.pos + 1 };
  // Pass finished: reshuffle, never opening with the setup just played.
  return { order: shuffled(d.order.length, d.order[d.pos]), pos: 0 };
}

export function Trainer() {
  const progress = useProgress();
  const [mode, setMode] = useState<Mode>("practice");
  // Fixed first render so server and client agree; the saved order loads after mount.
  const [order, setOrder] = useState<DeckState>({ order: practiceScenarios.map((_, i) => i), pos: 0 });
  // Review works through a snapshot of the misses taken when it opens.
  const [reviewQueue, setReviewQueue] = useState<Scenario[]>([]);
  const [reviewPos, setReviewPos] = useState(0);

  const deckFor = (m: Mode): Scenario[] =>
    m === "real" && realScenarios.length > 0 ? realScenarios : practiceScenarios;

  const openMode = useCallback((m: Mode) => {
    setMode(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      // ignore
    }
    if (m === "review") {
      const queue = getMisses();
      setReviewQueue(queue);
      setReviewPos(0);
    } else {
      setOrder(loadOrder(m, deckFor(m).length));
    }
  }, []);

  useEffect(() => {
    let saved: Mode = "practice";
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === "real" && realScenarios.length > 0) saved = "real";
      if (m === "review") saved = "review";
    } catch {
      // practice
    }
    openMode(saved);
  }, [openMode]);

  const deck = deckFor(mode);
  const stats = deckStats(progress, mode);
  const rate = stats.total === 0 ? "—" : `${Math.round((stats.correct / stats.total) * 100)}%`;
  const missCount = progress.misses.filter((id) => scenarioById.has(id)).length;
  const today = dateKey();
  const dailyDone = (progress.daily[today]?.length ?? 0) >= DAILY_SIZE;
  const streak = liveStreak(progress, today);

  let scenario: Scenario | undefined;
  let label = "";
  if (mode === "review") {
    scenario = reviewQueue[reviewPos];
    label = `Review ${reviewPos + 1} of ${reviewQueue.length}`;
  } else {
    scenario = deck[order.order[order.pos] ?? 0];
    label = `Setup ${order.pos + 1} of ${deck.length}`;
  }

  function onAnswered() {
    if (mode !== "review") saveOrder(mode, advance(order));
  }

  function onNext() {
    if (mode === "review") setReviewPos((p) => p + 1);
    else setOrder((d) => advance(d));
  }

  const tabs: [Mode, string, number][] = [
    ["practice", "Practice", practiceScenarios.length],
    ["real", "Real charts", realScenarios.length],
    ["review", "Review misses", missCount],
  ];

  return (
    <div className="flex flex-col gap-4">
      {!dailyDone && (
        <Link
          to="/daily"
          className="flex items-center gap-3 rounded-lg border border-primary/30 bg-surface px-4 py-3 transition-colors hover:border-primary/60"
        >
          <CalendarCheck size={20} className="shrink-0 text-primary" aria-hidden />
          <span className="flex-1 text-sm">
            <strong className="font-semibold">Today's Daily Chart is ready.</strong>{" "}
            <span className="text-muted">
              Five charts, same for everyone.{streak > 0 ? ` Keep your ${streak}-day streak going.` : ""}
            </span>
          </span>
          <span className="text-sm font-semibold text-primary">Play</span>
        </Link>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Deck"
          className="flex max-w-full overflow-x-auto rounded-md border border-border bg-surface p-0.5"
        >
          {tabs.map(([id, text, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => openMode(id)}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-[5px] px-3 text-sm font-medium whitespace-nowrap transition-colors md:h-9 ${
                mode === id ? "bg-fg text-bg" : "text-muted hover:text-fg"
              }`}
            >
              {text}
              <span className={`text-xs tabular-nums ${mode === id ? "opacity-70" : ""}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      <section aria-label="Score" className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <dl className="flex gap-6">
          <Stat label="Score" value={`${stats.correct}/${stats.total}`} />
          <Stat label="Hit rate" value={rate} />
          <Stat label="Streak" value={String(stats.streak)} />
          <Stat label="Best" value={String(stats.best)} />
        </dl>
        <Tally recent={stats.recent} size={TALLY} label={`Last ${TALLY}`} />
        <button
          type="button"
          onClick={() => resetDeck(mode)}
          disabled={stats.total === 0}
          className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted transition-colors hover:text-fg disabled:opacity-40 disabled:hover:text-muted md:h-9"
        >
          <RotateCcw size={15} aria-hidden />
          Reset score
        </button>
      </section>

      {mode === "real" && realScenarios.length === 0 && (
        <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
          No real charts yet. Run <code className="font-semibold text-fg">npm run data:yahoo</code> once to pull
          daily candles from Yahoo Finance. Practice setups are showing meanwhile.
        </p>
      )}

      {scenario ? (
        <Drill
          key={`${mode}-${scenario.id}-${mode === "review" ? reviewPos : order.pos}`}
          scenario={scenario}
          deck={mode}
          label={label}
          onAnswered={onAnswered}
          onNext={onNext}
          nextLabel={mode === "review" && reviewPos + 1 >= reviewQueue.length ? "Finish review" : "Next setup"}
        />
      ) : (
        <ReviewEmpty finished={reviewQueue.length > 0} onRestart={() => openMode("review")} hasMore={missCount > 0} />
      )}
    </div>
  );
}

function getMisses(): Scenario[] {
  return getProgress()
    .misses.map((id) => scenarioById.get(id))
    .filter((s): s is Scenario => !!s);
}

function ReviewEmpty({ finished, hasMore, onRestart }: { finished: boolean; hasMore: boolean; onRestart: () => void }) {
  return (
    <div className="graph-paper flex flex-col items-start gap-3 rounded-lg border border-border px-5 py-10 md:px-8">
      <h2 className="text-2xl font-bold [font-stretch:88%]">{finished ? "Review done" : "Nothing to review"}</h2>
      <p className="max-w-[52ch] text-sm text-muted">
        {finished
          ? hasMore
            ? "Some calls are still wrong. They stay in the queue until you get them right."
            : "Every miss is fixed. New wrong calls will land here."
          : "Charts you call wrong land here, so you can try them again until they stick."}
      </p>
      {finished && hasMore && (
        <button
          type="button"
          onClick={onRestart}
          className="min-h-11 rounded-md bg-fg px-4 font-semibold text-bg"
        >
          Go through them again
        </button>
      )}
    </div>
  );
}
