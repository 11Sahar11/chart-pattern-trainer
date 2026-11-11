import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronDown, Flame } from "lucide-react";
import { Drill, Tally } from "@/components/drill";
import { Onboarding } from "@/components/onboarding";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios, scenarioById } from "@/lib/real-scenarios";
import type { Scenario } from "@/lib/market";
import {
  DAILY_SIZE,
  dateKey,
  deckStats,
  getProgress,
  liveStreak,
  TALLY,
  useProgress,
} from "@/lib/progress";
import { arrangeFirstSession, completesSession, sessionProgress } from "@/lib/session";

type Mode = "practice" | "real" | "review";
const MODE_KEY = "cpt-mode";

/** A pass through a deck. `recap` is the end-of-session screen; `session` is this sitting's hits. */
type DeckState = { order: number[]; pos: number; recap: boolean; session: boolean[] };
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

function isNewPlayer(): boolean {
  const p = getProgress();
  return (p.decks.practice?.total ?? 0) + (p.decks.real?.total ?? 0) === 0;
}

function freshOrder(deck: Scenario[], easy: boolean): DeckState {
  return {
    order: easy ? arrangeFirstSession(deck) : shuffled(deck.length),
    pos: 0,
    recap: false,
    session: [],
  };
}

function loadOrder(mode: Mode, deck: Scenario[]): DeckState {
  const size = deck.length;
  try {
    const p = JSON.parse(
      localStorage.getItem(orderKey(mode)) ?? "null",
    ) as Partial<DeckState> | null;
    if (
      p &&
      Array.isArray(p.order) &&
      p.order.length === size &&
      new Set(p.order).size === size &&
      p.order.every((n) => Number.isInteger(n) && n >= 0 && n < size) &&
      typeof p.pos === "number" &&
      p.pos >= 0 &&
      p.pos < size
    ) {
      const sitting = sessionProgress(p.pos, size);
      let session = Array.isArray(p.session)
        ? p.session.filter((x): x is boolean => typeof x === "boolean")
        : [];
      // A saved sitting that doesn't line up with the chart on screen is from an older build.
      if (!p.recap && session.length !== sitting.index) session = [];
      return { order: p.order, pos: p.pos, recap: !!p.recap, session };
    }
  } catch {
    // fresh shuffle
  }
  const fresh = freshOrder(deck, mode !== "review" && isNewPlayer());
  saveOrder(mode, fresh);
  return fresh;
}

function saveOrder(mode: Mode, d: DeckState) {
  try {
    localStorage.setItem(orderKey(mode), JSON.stringify(d));
  } catch {
    // ignore
  }
}

function advance(d: DeckState): DeckState {
  if (d.pos + 1 < d.order.length) return { ...d, pos: d.pos + 1, recap: false };
  // Pass finished: reshuffle, never opening with the setup just played.
  return {
    order: shuffled(d.order.length, d.order[d.pos]),
    pos: 0,
    recap: false,
    session: d.session,
  };
}

export function Trainer() {
  const progress = useProgress();
  const [mode, setMode] = useState<Mode>("practice");
  // Fixed first render so server and client agree; the saved order loads after mount.
  const [order, setOrder] = useState<DeckState>({
    order: practiceScenarios.map((_, i) => i),
    pos: 0,
    recap: false,
    session: [],
  });
  // The chart after this reveal. Applied when the player presses Next, so a refresh skips the reveal.
  const pending = useRef<DeckState | null>(null);
  // Review works through a snapshot of the misses taken when it opens.
  const [reviewQueue, setReviewQueue] = useState<Scenario[]>([]);
  const [reviewPos, setReviewPos] = useState(0);

  const deckFor = (m: Mode): Scenario[] =>
    m === "real" && realScenarios.length > 0 ? realScenarios : practiceScenarios;

  const openMode = useCallback((m: Mode) => {
    setMode(m);
    pending.current = null;
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
      setOrder(loadOrder(m, deckFor(m)));
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
    const sitting = sessionProgress(order.pos, deck.length);
    label = `Setup ${sitting.index + 1} of ${sitting.size}`;
  }

  function onAnswered(right: boolean) {
    if (mode === "review") return;
    const session = [...order.session, right];
    const filled = completesSession(order.pos, deck.length);
    const saved: DeckState = { ...advance({ ...order, session }), recap: filled, session };
    saveOrder(mode, saved);
    pending.current = saved;
    setOrder((d) => ({ ...d, session }));
  }

  function onNext() {
    if (mode === "review") {
      setReviewPos((p) => p + 1);
      return;
    }
    const next = pending.current ?? advance(order);
    pending.current = null;
    setOrder(next);
  }

  function continueTraining() {
    setOrder((d) => {
      const next = { ...d, recap: false, session: [] };
      saveOrder(mode, next);
      return next;
    });
  }

  const tabs: [Mode, string, number][] = [
    ["practice", "Practice", practiceScenarios.length],
    ...(realScenarios.length > 0
      ? [["real", "Real charts", realScenarios.length] as [Mode, string, number]]
      : []),
    ["review", "Review misses", missCount],
  ];

  const showRecap = mode !== "review" && order.recap;

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
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-3 text-muted"
            aria-hidden
          />
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

      {showRecap ? (
        <SessionRecap hits={order.session} onContinue={continueTraining} />
      ) : scenario ? (
        <Drill
          key={`${mode}-${scenario.id}-${mode === "review" ? reviewPos : order.pos}`}
          scenario={scenario}
          deck={mode}
          label={label}
          onAnswered={onAnswered}
          onNext={onNext}
          nextLabel={
            mode === "review" && reviewPos + 1 >= reviewQueue.length ? "Finish review" : "Next"
          }
        />
      ) : (
        <ReviewEmpty
          finished={reviewQueue.length > 0}
          onRestart={() => openMode("review")}
          hasMore={missCount > 0}
        />
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

/** End of a sitting: the score, then today's Daily and the streak that brings them back. */
function SessionRecap({ hits, onContinue }: { hits: boolean[]; onContinue: () => void }) {
  const progress = useProgress();
  const today = dateKey();
  const streak = liveStreak(progress, today);
  const done = (progress.daily[today]?.length ?? 0) >= DAILY_SIZE;
  const right = hits.filter(Boolean).length;

  return (
    <section className="graph-paper flex flex-col gap-5 rounded-lg border border-border px-5 py-6 md:px-8 md:py-8">
      <div>
        <h2 className="text-2xl font-bold [font-stretch:88%] md:text-3xl">Session done</h2>
        {hits.length > 0 && (
          <p className="mt-2 text-4xl font-bold tabular-nums [font-stretch:88%]">
            {right}
            <span className="text-muted">/{hits.length}</span>
            <span className="ml-2 text-lg font-semibold">right</span>
          </p>
        )}
        {hits.length > 0 && (
          <div className="mt-3">
            <Tally recent={hits} size={hits.length} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <p className="label">Today's Daily Chart</p>
        <p className="flex items-center gap-2 text-2xl font-bold [font-stretch:88%]">
          <Flame size={22} className="text-ema" aria-hidden />
          {streak > 0 ? `${streak}-day streak` : "Start a streak"}
        </p>
        <p className="text-sm leading-relaxed text-muted">
          {done
            ? "You've played today's five charts. A new set is ready at midnight."
            : streak > 0
              ? "Today's five charts keep the streak going. Same charts for everyone."
              : "Five charts, the same for everyone today. Play them to start a streak."}
        </p>
        <Link
          to="/daily"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg transition-opacity hover:opacity-90"
        >
          <CalendarCheck size={18} aria-hidden />
          {done ? "See today's score" : "Play today's Daily"}
        </Link>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex min-h-12 items-center justify-center rounded-md border border-border bg-surface px-4 font-semibold"
      >
        Keep training
      </button>
    </section>
  );
}

function ReviewEmpty({
  finished,
  hasMore,
  onRestart,
}: {
  finished: boolean;
  hasMore: boolean;
  onRestart: () => void;
}) {
  return (
    <div className="graph-paper flex flex-col items-start gap-3 rounded-lg border border-border px-5 py-10 md:px-8">
      <h2 className="text-2xl font-bold [font-stretch:88%]">
        {finished ? "Review done" : "Nothing to review"}
      </h2>
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
