import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Flame } from "lucide-react";
import { Drill, Tally } from "@/components/drill";
import { Onboarding } from "@/components/onboarding";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios, scenarioById } from "@/lib/real-scenarios";
import type { Scenario } from "@/lib/market";
import { DAILY_SIZE, TALLY, dateKey, deckStats, getProgress, liveStreak, useProgress } from "@/lib/progress";
import {
  SESSION_SIZE,
  advance,
  atSessionBreak,
  continueSession,
  finishedSessionHits,
  freshOrder,
  inFirstSession,
  markFirstSessionActive,
  markFirstSessionDone,
  parseOrder,
  playingLabel,
  type DeckState,
} from "@/lib/session";

type Mode = "practice" | "real" | "review";
const MODE_KEY = "cpt-mode";
const orderKey = (mode: Mode) => `cpt-order-${mode}`;

function deckFor(m: Mode): Scenario[] {
  return m === "real" && realScenarios.length > 0 ? realScenarios : practiceScenarios;
}

function loadOrder(mode: Mode): DeckState {
  const deck = deckFor(mode);
  const saved = parseOrder(typeof window === "undefined" ? null : localStorage.getItem(orderKey(mode)), deck.length);
  if (saved) return saved;
  const first = inFirstSession();
  if (first) markFirstSessionActive();
  const next = freshOrder(deck, first);
  saveOrder(mode, next);
  return next;
}

function saveOrder(mode: Mode, d: DeckState) {
  try {
    localStorage.setItem(orderKey(mode), JSON.stringify(d));
  } catch {
    // ignore
  }
}

const blankOrder = (): DeckState => ({
  order: practiceScenarios.map((_, i) => i),
  pos: 0,
  hits: [],
  ack: 0,
});

export function Trainer() {
  const progress = useProgress();
  const [mode, setMode] = useState<Mode>("practice");
  // Fixed first render so server and client agree; the saved order loads after mount.
  const [order, setOrder] = useState<DeckState>(blankOrder);
  const [reviewQueue, setReviewQueue] = useState<Scenario[]>([]);
  const [reviewPos, setReviewPos] = useState(0);

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
      setOrder(loadOrder(m));
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
  const onBreak = mode !== "review" && atSessionBreak(order);

  useEffect(() => {
    if (onBreak) markFirstSessionDone();
  }, [onBreak]);

  let scenario: Scenario | undefined;
  let label = "";
  if (mode === "review") {
    scenario = reviewQueue[reviewPos];
    label = `Review ${reviewPos + 1} of ${reviewQueue.length}`;
  } else if (!onBreak) {
    scenario = deck[order.order[order.pos] ?? 0];
    label = playingLabel(order.pos, deck.length);
  }

  function onAnswered(right: boolean) {
    if (mode === "review") return;
    setOrder((d) => {
      const hits = d.hits.slice();
      hits[d.pos] = right;
      const withHits = { ...d, hits };
      saveOrder(mode, advance(withHits));
      return withHits;
    });
  }

  function onNext() {
    if (mode === "review") setReviewPos((p) => p + 1);
    else setOrder((d) => advance(d));
  }

  function onAnother() {
    setOrder((d) => {
      const next = continueSession(d, deck);
      saveOrder(mode, next);
      return next;
    });
  }

  const nextIsBreak =
    mode !== "review" && (order.pos + 1 >= order.order.length || (order.pos + 1) % SESSION_SIZE === 0);
  const tabs: [Mode, string, number][] = [
    ["practice", "Practice", practiceScenarios.length],
    ...(realScenarios.length > 0 ? [["real", "Real charts", realScenarios.length] as [Mode, string, number]] : []),
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

      {mode !== "review" && onBreak ? (
        <SessionEnd hits={finishedSessionHits(order)} onAgain={onAnother} />
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
              : nextIsBreak
                ? "Session results"
                : "Next setup"
          }
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

function SessionEnd({ hits, onAgain }: { hits: boolean[]; onAgain: () => void }) {
  const progress = useProgress();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(dateKey()), []);
  const right = hits.filter(Boolean).length;
  const done = today ? (progress.daily[today]?.length ?? 0) >= DAILY_SIZE : false;
  const streak = today ? liveStreak(progress, today) : 0;
  const word = right === hits.length ? "Clean session." : right * 2 >= hits.length ? "Nice read." : "Session done.";

  return (
    <section className="graph-paper flex flex-col items-start gap-4 rounded-lg border border-border px-5 py-8 md:px-8">
      <div>
        <p className="label">This session</p>
        <p className="text-5xl font-bold tabular-nums [font-stretch:88%]">
          {right}
          <span className="text-muted">/{hits.length}</span>
        </p>
        <p className="mt-1 text-lg font-semibold">{word}</p>
      </div>
      <Link
        to="/daily"
        className="flex w-full max-w-md flex-col items-start gap-0.5 rounded-md bg-fg px-4 py-3 text-bg"
      >
        <span className="text-base font-semibold">{done ? "Today's Daily is done" : "Today's Daily Chart"}</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-bg/80">
          <Flame size={14} aria-hidden />
          {streak > 0 ? `${streak}-day streak` : "Five charts, same for everyone"}
        </span>
      </Link>
      <button type="button" onClick={onAgain} className="min-h-11 text-sm font-semibold text-primary">
        Another session
      </button>
    </section>
  );
}

function ReviewEmpty({ finished, hasMore, onRestart }: { finished: boolean; hasMore: boolean; onRestart: () => void }) {
  const progress = useProgress();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(dateKey()), []);
  const streak = today ? liveStreak(progress, today) : 0;

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
      <Link to="/daily" className="text-sm font-semibold text-primary">
        Today's Daily Chart{streak > 0 ? ` · ${streak}-day streak` : ""}
      </Link>
      {finished && hasMore && (
        <button type="button" onClick={onRestart} className="min-h-11 rounded-md bg-fg px-4 font-semibold text-bg">
          Go through them again
        </button>
      )}
    </div>
  );
}
