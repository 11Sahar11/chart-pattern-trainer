import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import { indicatorLabels, scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios } from "@/lib/real-scenarios";
import type { Direction, IndicatorId } from "@/lib/market";

type Mode = "practice" | "real";
const STORAGE_KEY = "chart-pattern-trainer-v1";
const MODE_KEY = "chart-pattern-trainer-mode";
const TALLY = 20;
const statsKey = (mode: Mode) => (mode === "practice" ? STORAGE_KEY : `${STORAGE_KEY}-real`);

type Stats = {
  correct: number;
  total: number;
  streak: number;
  best: number;
  /** Most recent last; true = hit. */
  recent: boolean[];
};

const emptyStats: Stats = { correct: 0, total: 0, streak: 0, best: 0, recent: [] };

const calls: { id: Direction; label: string; hint: string; key: string }[] = [
  { id: "up", label: "Higher", hint: "Next swing resolves up", key: "↑" },
  { id: "down", label: "Lower", hint: "Next swing resolves down", key: "↓" },
  { id: "sideways", label: "No edge", hint: "Range, or not clear yet", key: "N" },
];

const indicators: { id: IndicatorId; swatch: string }[] = [
  { id: "sma", swatch: "bg-sma" },
  { id: "ema", swatch: "bg-ema" },
  { id: "volume", swatch: "bg-pencil" },
  { id: "rsi", swatch: "bg-fg" },
];

function loadStats(mode: Mode): Stats {
  try {
    const raw = localStorage.getItem(statsKey(mode));
    if (!raw) return emptyStats;
    const parsed = JSON.parse(raw) as Partial<Stats>;
    return {
      correct: parsed.correct ?? 0,
      total: parsed.total ?? 0,
      streak: parsed.streak ?? 0,
      best: parsed.best ?? 0,
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(-TALLY) : [],
    };
  } catch {
    return emptyStats;
  }
}

/** A shuffled pass through the deck, so the same setup never comes up twice in a row. */
type DeckState = { order: number[]; pos: number };
const deckKey = (mode: Mode) => `${statsKey(mode)}-deck`;

function shuffled(n: number, avoidFirst?: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n > 1 && a[0] === avoidFirst) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

function loadDeck(mode: Mode, size: number): DeckState {
  try {
    const parsed = JSON.parse(localStorage.getItem(deckKey(mode)) ?? "null") as DeckState | null;
    if (
      parsed &&
      Array.isArray(parsed.order) &&
      parsed.order.length === size &&
      parsed.pos >= 0 &&
      parsed.pos < size
    ) {
      return parsed;
    }
  } catch {
    // fall through to a fresh shuffle
  }
  return { order: shuffled(size), pos: 0 };
}

function saveDeck(mode: Mode, deck: DeckState) {
  try {
    localStorage.setItem(deckKey(mode), JSON.stringify(deck));
  } catch {
    // ignore
  }
}

function advance(d: DeckState): DeckState {
  if (d.pos + 1 < d.order.length) return { order: d.order, pos: d.pos + 1 };
  // Pass finished: reshuffle, never opening with the setup just played.
  return { order: shuffled(d.order.length, d.order[d.pos]), pos: 0 };
}

function saveStats(mode: Mode, stats: Stats) {
  try {
    localStorage.setItem(statsKey(mode), JSON.stringify(stats));
  } catch {
    // storage unavailable: the score lives for this visit only
  }
}

export function Trainer() {
  const [mode, setMode] = useState<Mode>("practice");
  // Starts in a fixed order so server and client render the same first setup;
  // the saved or shuffled order replaces it right after mount.
  const [deckState, setDeckState] = useState<DeckState>({
    order: practiceScenarios.map((_, i) => i),
    pos: 0,
  });
  const [phase, setPhase] = useState<"read" | "revealed">("read");
  const [pick, setPick] = useState<Direction | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [on, setOn] = useState<Record<IndicatorId, boolean>>({
    sma: false,
    ema: false,
    volume: true,
    rsi: false,
  });

  useEffect(() => {
    let saved: Mode = "practice";
    try {
      if (localStorage.getItem(MODE_KEY) === "real" && realScenarios.length > 0) saved = "real";
    } catch {
      // stay on practice
    }
    setMode(saved);
    setStats(loadStats(saved));
    setDeckState(loadDeck(saved, saved === "real" ? realScenarios.length : practiceScenarios.length));
  }, []);

  const deck = mode === "real" && realScenarios.length > 0 ? realScenarios : practiceScenarios;
  const realEmpty = mode === "real" && realScenarios.length === 0;
  const index = deckState.order[deckState.pos] ?? 0;
  const scenario = deck[index % deck.length];
  const hit = pick === scenario.correct;
  const visibleCount = phase === "read" ? scenario.revealAt : scenario.candles.length;
  const guides = useMemo(() => (phase === "revealed" ? scenario.guides : []), [phase, scenario]);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setDeckState(loadDeck(next, next === "real" && realScenarios.length > 0 ? realScenarios.length : practiceScenarios.length));
    setPhase("read");
    setPick(null);
    setStats(loadStats(next));
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // ignore
    }
  }

  const commit = useCallback(
    (direction: Direction) => {
      if (phase !== "read") return;
      const right = direction === scenario.correct;
      setPick(direction);
      setPhase("revealed");
      setStats((prev) => {
        const next: Stats = {
          correct: prev.correct + (right ? 1 : 0),
          total: prev.total + 1,
          streak: right ? prev.streak + 1 : 0,
          best: right ? Math.max(prev.best, prev.streak + 1) : prev.best,
          recent: [...prev.recent, right].slice(-TALLY),
        };
        saveStats(mode, next);
        return next;
      });
      // Answered: a reload should open the next setup, not this one again.
      saveDeck(mode, advance(deckState));
    },
    [phase, scenario, mode, deckState],
  );

  const nextSetup = useCallback(() => {
    setDeckState((d) => advance(d));
    setPhase("read");
    setPick(null);
  }, []);

  function resetScore() {
    try {
      localStorage.removeItem(statsKey(mode));
    } catch {
      // ignore
    }
    setStats(emptyStats);
  }

  // Keyboard: ↑ higher, ↓ lower, N no edge; Enter or → for the next setup.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (phase === "read") {
        const map: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", n: "sideways", N: "sideways" };
        const d = map[e.key];
        if (d) {
          e.preventDefault();
          commit(d);
        }
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        if (target?.tagName === "BUTTON" && e.key === "Enter") return;
        e.preventDefault();
        nextSetup();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, commit, nextSetup]);

  const rate = stats.total === 0 ? "—" : `${Math.round((stats.correct / stats.total) * 100)}%`;
  const markerTime = scenario.candles[scenario.revealAt - 1]?.time;

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-4 pb-8 md:px-8">
      <header className="flex flex-col gap-4 border-b border-border py-5 md:flex-row md:items-end md:justify-between md:py-7">
        <div>
          <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">
            Chart Pattern Trainer
          </h1>
          <p className="mt-1 max-w-[52ch] text-sm text-muted">
            The chart stops before the move. Call it, then see what happened and which tools helped.
          </p>
        </div>

        <div role="tablist" aria-label="Deck" className="flex self-start rounded-md border border-border bg-surface p-0.5 md:self-auto">
          {(
            [
              ["practice", "Practice", practiceScenarios.length],
              ["real", "Real charts", realScenarios.length],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => switchMode(id)}
              className={`flex h-11 items-center gap-2 rounded-[5px] px-3 md:h-9 text-sm font-medium transition-colors ${
                mode === id ? "bg-fg text-bg" : "text-muted hover:text-fg"
              }`}
            >
              {label}
              <span className={`tabular-nums text-xs ${mode === id ? "opacity-70" : ""}`}>{count}</span>
            </button>
          ))}
        </div>
      </header>

      <section aria-label="Score" className="flex flex-wrap items-center gap-x-6 gap-y-3 py-4">
        <dl className="flex gap-6">
          <Stat label="Score" value={`${stats.correct}/${stats.total}`} />
          <Stat label="Hit rate" value={rate} />
          <Stat label="Streak" value={String(stats.streak)} />
          <Stat label="Best" value={String(stats.best)} />
        </dl>
        <Tally recent={stats.recent} />
        <button
          type="button"
          onClick={resetScore}
          disabled={stats.total === 0}
          className="ml-auto inline-flex h-11 items-center md:h-9 gap-1.5 rounded-md px-2 text-sm text-muted transition-colors hover:text-fg disabled:opacity-40 disabled:hover:text-muted"
        >
          <RotateCcw size={15} aria-hidden />
          Reset score
        </button>
      </section>

      {realEmpty && (
        <p className="mb-4 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
          No real charts yet. Run <code className="font-semibold text-fg">npm run data:yahoo</code> once to
          pull daily candles from Yahoo Finance, then reload. Practice setups are showing meanwhile.
        </p>
      )}

      <main className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-lg border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5 md:px-4">
            <p className="text-sm">
              <span className="font-semibold tabular-nums">
                Setup {deckState.pos + 1}
                <span className="font-normal text-muted"> of {deck.length}</span>
              </span>
              <span className="text-muted">
                {" · "}
                {phase === "revealed"
                  ? scenario.pattern
                  : scenario.source
                    ? "ticker and dates hidden"
                    : "pattern hidden"}
              </span>
            </p>
            <fieldset className="flex flex-wrap gap-1.5">
              <legend className="sr-only">Indicators</legend>
              {indicators.map(({ id, swatch }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={on[id]}
                  onClick={() => setOn((s) => ({ ...s, [id]: !s[id] }))}
                  className={`inline-flex h-10 items-center gap-2 rounded-md border px-2.5 md:h-8 text-xs font-medium transition-colors ${
                    on[id]
                      ? "border-fg/40 bg-raised text-fg"
                      : "border-border text-muted hover:border-fg/30 hover:text-fg"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-0.5 w-3.5 rounded-full ${swatch} ${on[id] ? "" : "opacity-40"}`}
                  />
                  {indicatorLabels[id]}
                </button>
              ))}
            </fieldset>
          </div>
          <PriceChart
            candles={scenario.candles}
            visibleCount={visibleCount}
            showSma={on.sma}
            showEma={on.ema}
            showVolume={on.volume}
            showRsi={on.rsi}
            guides={guides}
            markerTime={markerTime}
          />
        </div>

        <aside
          aria-live="polite"
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-5"
        >
          {phase === "read" ? (
            <>
              <div>
                <h2 className="text-xl font-bold [font-stretch:88%]">Your call</h2>
                <p className="mt-1 text-sm text-muted">
                  What does price do after the Call arrow? Add only the indicators you would
                  actually trust.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {calls.map((call) => (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => commit(call.id)}
                    className={`group flex min-h-14 items-center gap-3 rounded-md border bg-surface px-3.5 text-left transition-colors ${
                      call.id === "up"
                        ? "border-up/45 hover:bg-up/8"
                        : call.id === "down"
                          ? "border-down/45 hover:bg-down/8"
                          : "border-border hover:bg-raised"
                    }`}
                  >
                    <CallIcon id={call.id} />
                    <span className="flex-1">
                      <span className="block text-base font-semibold">{call.label}</span>
                      <span className="block text-sm text-muted">{call.hint}</span>
                    </span>
                    <kbd className="hidden h-6 min-w-6 items-center justify-center rounded border border-border px-1.5 text-muted md:inline-flex">
                      {call.key}
                    </kbd>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <Verdict hit={hit} />
              <div>
                <h2 className="text-2xl leading-tight font-bold [font-stretch:88%]">
                  {scenario.source ? scenario.source.ticker : scenario.pattern}
                </h2>
                {scenario.source ? (
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    {scenario.source.from} → {scenario.source.to}
                    {" · next 20 days "}
                    <span className={`font-semibold ${scenario.source.move >= 0 ? "text-up" : "text-down"}`}>
                      {scenario.source.move >= 0 ? "+" : ""}
                      {scenario.source.move.toFixed(1)}%
                    </span>
                  </p>
                ) : null}
                <p className="mt-2 text-sm">
                  You called <strong>{labelFor(pick)}</strong>. It went{" "}
                  <strong className={scenario.correct === "up" ? "text-up" : scenario.correct === "down" ? "text-down" : ""}>
                    {labelFor(scenario.correct)}
                  </strong>
                  .
                </p>
              </div>
              <p className="text-sm leading-relaxed">{scenario.explanation}</p>
              <div className="border-t border-border pt-4">
                <h3 className="label">What helped</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{scenario.indicatorNote}</p>
                {scenario.useful.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {scenario.useful.map((id) => (
                      <li
                        key={id}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          on[id] ? "border-up/50 text-up" : "border-border text-muted"
                        }`}
                      >
                        {indicatorLabels[id]}
                        {on[id] ? " · you had it on" : " · was off"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-sm text-muted">{scenario.caution}</p>
              <button
                type="button"
                onClick={nextSetup}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg transition-opacity hover:opacity-90"
              >
                Next setup
                <ArrowRight size={17} aria-hidden />
              </button>
            </>
          )}
        </aside>
      </main>

      <footer className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-xs text-muted">
        <p className="max-w-[70ch]">
          A drill, not a broker. Practice setups are hand-drawn; real charts use Yahoo Finance daily
          data rebased to 100. A correct call here is no reason to trade real money.
        </p>
        <Link to="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-2 hover:text-fg md:min-h-0">
          Privacy policy
        </Link>
      </footer>
    </div>
  );
}

function labelFor(direction: Direction | null) {
  if (direction === "up") return "higher";
  if (direction === "down") return "lower";
  if (direction === "sideways") return "no edge";
  return "nothing";
}

function CallIcon({ id }: { id: Direction }) {
  const cls = "flex h-9 w-9 shrink-0 items-center justify-center rounded-md";
  if (id === "up")
    return (
      <span className={`${cls} bg-up/12 text-up`}>
        <ArrowUp size={19} strokeWidth={2.25} aria-hidden />
      </span>
    );
  if (id === "down")
    return (
      <span className={`${cls} bg-down/12 text-down`}>
        <ArrowDown size={19} strokeWidth={2.25} aria-hidden />
      </span>
    );
  return (
    <span className={`${cls} bg-raised text-pencil`}>
      <ArrowRight size={19} strokeWidth={2.25} aria-hidden />
    </span>
  );
}

/** Verdict word circled in pencil once the plotted reveal has landed. */
function Verdict({ hit }: { hit: boolean }) {
  return (
    <p className={`relative inline-flex self-start px-3 py-1 text-lg font-bold [font-stretch:88%] ${hit ? "text-up" : "text-down"}`}>
      {hit ? "Hit" : "Miss"}
      <svg
        aria-hidden
        viewBox="0 0 100 44"
        preserveAspectRatio="none"
        className="pencil-ring pointer-events-none absolute -inset-x-1 -inset-y-1 h-[calc(100%+0.5rem)] w-[calc(100%+0.5rem)]"
      >
        <path
          d="M52 4 C 84 2, 98 12, 96 23 C 94 36, 66 42, 44 41 C 18 40, 3 33, 4 21 C 5 9, 26 3, 58 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </p>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

/** The last 20 calls as boxes on the grid: filled = hit, crossed = miss. */
function Tally({ recent }: { recent: boolean[] }) {
  const hits = recent.filter(Boolean).length;
  return (
    <div className="flex items-center gap-2">
      <span className="label">Last {TALLY}</span>
      <ol
        className="flex gap-[3px]"
        aria-label={recent.length ? `Last ${recent.length} calls: ${hits} hits` : "No calls yet"}
      >
        {Array.from({ length: TALLY }, (_, i) => {
          const r = recent[i - (TALLY - recent.length)];
          return (
            <li
              key={i}
              className={`relative h-3.5 w-3.5 rounded-[2px] border ${
                r === true ? "border-up bg-up" : r === false ? "border-down/70" : "border-border"
              }`}
            >
              {r === false && (
                <svg viewBox="0 0 10 10" aria-hidden className="absolute inset-0 text-down">
                  <path d="M2 2 L8 8 M8 2 L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
