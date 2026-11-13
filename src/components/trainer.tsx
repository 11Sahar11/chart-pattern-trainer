import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
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
import {
  answersIntoBlock,
  arrangeFirstSession,
  completesSession,
  FIRST_SESSION_IDS,
} from "@/lib/session";

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

function practiceCalls(): number {
  return getProgress().decks.practice?.total ?? 0;
}

function hasFixedOpen(deck: Scenario[], order: number[]): boolean {
  return FIRST_SESSION_IDS.every((id, i) => deck[order[i]]?.id === id);
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
      let session = Array.isArray(p.session)
        ? p.session.filter((x): x is boolean => typeof x === "boolean")
        : [];
      // A saved sitting that doesn't line up with the chart on screen is from an older build.
      if (!p.recap && session.length !== answersIntoBlock(p.pos)) session = [];
      const saved: DeckState = { order: p.order, pos: p.pos, recap: !!p.recap, session };
      // Real charts never stop for the Daily card. A recap saved mid-round (the old
      // five-chart break) is dropped.
      if (mode === "real") return { ...saved, recap: false };
      if (
        mode === "practice" &&
        saved.recap &&
        saved.pos !== 0 &&
        !completesSession(saved.pos - 1, size)
      ) {
        saved.recap = false;
        saved.session = [];
      }
      if (
        mode === "practice" &&
        practiceCalls() === 0 &&
        p.pos === 0 &&
        !p.recap &&
        hasFixedOpen(deck, p.order)
      ) {
        return saved;
      }
      if (mode === "practice" && practiceCalls() === 0) {
        const fresh = freshOrder(deck, true);
        saveOrder(mode, fresh);
        return fresh;
      }
      return saved;
    }
  } catch {
    // fresh shuffle
  }
  const fresh = freshOrder(deck, mode === "practice" && practiceCalls() === 0);
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
    label = `Setup ${order.pos + 1} of ${deck.length}`;
  }

  function onAnswered(right: boolean) {
    if (mode === "review") return;
    const session = [...order.session, right];
    // The Daily card is practice-only, and only after 10 calls or the last chart.
    const filled = mode === "practice" && completesSession(order.pos, deck.length);
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

  const showRecap = mode === "practice" && order.recap;
  const closingPractice =
    mode === "practice" && !showRecap && completesSession(order.pos, deck.length);

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
            mode === "review" && reviewPos + 1 >= reviewQueue.length
              ? "Finish review"
              : closingPractice
                ? "Play today's Daily"
                : "Next"
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

/** End of a practice sitting: today's Daily, or a countdown once it is done. */
function SessionRecap({ hits, onContinue }: { hits: boolean[]; onContinue: () => void }) {
  const progress = useProgress();
  const today = dateKey();
  const streak = liveStreak(progress, today);
  const done = (progress.daily[today]?.length ?? 0) >= DAILY_SIZE;
  const right = hits.filter(Boolean).length;

  return (
    <section className="graph-paper flex flex-col gap-5 rounded-lg border border-border px-5 py-6 md:px-8 md:py-8">
      {hits.length > 0 && (
        <p className="text-4xl font-bold tabular-nums [font-stretch:88%]">
          {right}
          <span className="text-muted">/{hits.length}</span>
        </p>
      )}
      <div>
        <h2 className="text-2xl font-bold [font-stretch:88%] md:text-3xl">
          Session done. Today's chart is waiting.
        </h2>
        <p className="mt-2 text-lg font-semibold">Day {streak} streak. One chart keeps it going.</p>
      </div>
      {done ? (
        <DailyCountdown />
      ) : (
        <Link
          to="/daily"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-fg px-4 font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Play today's Daily
        </Link>
      )}
      <button
        type="button"
        onClick={onContinue}
        className="self-center text-sm text-muted underline-offset-2 hover:underline"
      >
        Keep training
      </button>
    </section>
  );
}

function DailyCountdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      setLeft(`${h}h ${String(m).padStart(2, "0")}m`);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="text-sm text-muted">
      Next Daily Chart in <span className="font-semibold text-fg tabular-nums">{left}</span>
    </p>
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
