import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Drill, Tally } from "@/components/drill";
import { Onboarding } from "@/components/onboarding";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios, scenarioById } from "@/lib/real-scenarios";
import type { Scenario } from "@/lib/market";
import { TALLY, deckStats, getProgress, useProgress } from "@/lib/progress";

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
    ...(realScenarios.length > 0
      ? [["real", "Real charts", realScenarios.length] as [Mode, string, number]]
      : []),
    ["review", "Review misses", missCount],
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <label className="relative inline-flex items-center">
          <span className="sr-only">Deck</span>
          <select
            id="deck"
            value={mode}
            onChange={(e) => openMode(e.target.value as Mode)}
            className="h-11 appearance-none rounded-md border border-border bg-surface pr-9 pl-3 text-sm font-semibold md:h-9"
          >
            {tabs.map(([id, text, count]) => (
              <option key={id} value={id}>
                {text} ({count})
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-3 text-muted" aria-hidden />
        </label>
        <div className="flex items-center gap-4">
          <span className="hidden md:block">
            <Tally recent={stats.recent} size={TALLY} />
          </span>
          <Link to="/stats" className="text-right text-sm tabular-nums" aria-label="Your stats">
            <span className="font-semibold">
              {stats.correct}/{stats.total}
            </span>
            <span className="text-muted">
              {stats.total > 0 ? ` · ${rate}` : ""}
              {stats.streak > 1 ? ` · ${stats.streak} in a row` : ""}
            </span>
          </Link>
        </div>
      </div>

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
      <Onboarding />
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
