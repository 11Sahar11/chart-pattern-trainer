import { useEffect, useMemo, useState } from "react";
import { Minus, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import { indicatorLabels, scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios } from "@/lib/real-scenarios";
import type { Direction, IndicatorId } from "@/lib/market";

type Mode = "practice" | "real";
const STORAGE_KEY = "chart-pattern-trainer-v1";
const MODE_KEY = "chart-pattern-trainer-mode";
const statsKey = (mode: Mode) => (mode === "practice" ? STORAGE_KEY : `${STORAGE_KEY}-real`);

type Stats = {
  correct: number;
  total: number;
  streak: number;
  best: number;
};

const emptyStats: Stats = { correct: 0, total: 0, streak: 0, best: 0 };

const calls: { id: Direction; label: string; hint: string }[] = [
  { id: "up", label: "Higher", hint: "Next swing resolves up" },
  { id: "down", label: "Lower", hint: "Next swing resolves down" },
  { id: "sideways", label: "No edge", hint: "Range, or not clear yet" },
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
    };
  } catch {
    return emptyStats;
  }
}

export function Trainer() {
  const [mode, setMode] = useState<Mode>("practice");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"read" | "revealed">("read");
  const [pick, setPick] = useState<Direction | null>(null);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [smaOn, setSmaOn] = useState(false);
  const [emaOn, setEmaOn] = useState(false);
  const [volumeOn, setVolumeOn] = useState(true);
  const [rsiOn, setRsiOn] = useState(false);

  useEffect(() => {
    let saved: Mode = "practice";
    try {
      if (localStorage.getItem(MODE_KEY) === "real" && realScenarios.length > 0) saved = "real";
    } catch {
      // storage unavailable: stay on practice
    }
    setMode(saved);
    setStats(loadStats(saved));
  }, []);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setIndex(0);
    setPhase("read");
    setPick(null);
    setStats(loadStats(next));
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // ignore
    }
  }

  const scenarios = mode === "real" && realScenarios.length > 0 ? realScenarios : practiceScenarios;
  const realEmpty = mode === "real" && realScenarios.length === 0;
  const scenario = scenarios[index % scenarios.length];
  const visible = useMemo(
    () =>
      phase === "read" ? scenario.candles.slice(0, scenario.revealAt) : scenario.candles,
    [phase, scenario],
  );
  const hit = pick === scenario.correct;
  const enabled = new Set<IndicatorId>([
    ...(smaOn ? (["sma"] as const) : []),
    ...(emaOn ? (["ema"] as const) : []),
    ...(volumeOn ? (["volume"] as const) : []),
    ...(rsiOn ? (["rsi"] as const) : []),
  ]);

  function commit(direction: Direction) {
    if (phase !== "read") return;
    setPick(direction);
    setPhase("revealed");
    setStats((prev) => {
      const next: Stats = {
        correct: prev.correct + (direction === scenario.correct ? 1 : 0),
        total: prev.total + 1,
        streak: direction === scenario.correct ? prev.streak + 1 : 0,
        best:
          direction === scenario.correct
            ? Math.max(prev.best, prev.streak + 1)
            : prev.best,
      };
      try {
        localStorage.setItem(statsKey(mode), JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function nextSetup() {
    setIndex((n) => (n + 1) % scenarios.length);
    setPhase("read");
    setPick(null);
  }

  function resetScore() {
    try {
      localStorage.removeItem(statsKey(mode));
    } catch {
      // ignore
    }
    setStats(emptyStats);
  }

  const rate = stats.total === 0 ? 0 : Math.round((stats.correct / stats.total) * 100);
  const markerTime = scenario.candles[scenario.revealAt - 1]?.time;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8 md:py-10">
      <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <p className="text-xs tracking-[0.22em] text-primary uppercase">Daily tape drill</p>
          <h1 className="mt-2 font-display text-4xl text-fg md:text-5xl">Chart Pattern Trainer</h1>
          <p className="mt-3 max-w-md text-base text-muted">
            A chart stops before the move. Add the tools you want, call the direction, then see
            which read actually mattered.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Chart source"
            className="flex h-11 items-center rounded-full border border-border p-1"
          >
            {(
              [
                ["practice", `Practice · ${practiceScenarios.length}`],
                ["real", `Real charts · ${realScenarios.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                onClick={() => switchMode(id)}
                className={`h-9 rounded-full px-3 text-sm transition ${
                  mode === id ? "bg-primary/15 text-primary" : "text-muted hover:text-fg"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Stat label="Score" value={`${stats.correct}/${stats.total}`} />
          <Stat label="Hit rate" value={`${rate}%`} />
          <Stat label="Streak" value={String(stats.streak)} />
          <Stat label="Best" value={String(stats.best)} />
          <button
            type="button"
            onClick={resetScore}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm text-muted transition hover:text-fg"
          >
            <RotateCcw size={16} />
            Reset
          </button>
        </div>
      </header>

      {realEmpty && (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
          No real charts yet. Run <code className="text-fg">npm run data:yahoo</code> once to pull
          daily candles from Yahoo Finance, then reload. Showing practice setups meanwhile.
        </p>
      )}

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-xs tracking-wide text-muted uppercase">
                Setup {index + 1} of {scenarios.length}
              </p>
              <p className="text-sm text-fg">
                {phase === "read"
                  ? scenario.source
                    ? "Ticker and dates hidden until you commit"
                    : "Pattern hidden until you commit"
                  : scenario.pattern}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Toggle on={smaOn} set={setSmaOn} label="SMA 20" />
              <Toggle on={emaOn} set={setEmaOn} label="EMA 12" />
              <Toggle on={volumeOn} set={setVolumeOn} label="Volume" />
              <Toggle on={rsiOn} set={setRsiOn} label="RSI" />
            </div>
          </div>
          <PriceChart
            candles={visible}
            showSma={smaOn}
            showEma={emaOn}
            showVolume={volumeOn}
            showRsi={rsiOn}
            guides={phase === "revealed" ? scenario.guides : []}
            markerTime={markerTime}
          />
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
          {phase === "read" ? (
            <>
              <div>
                <h2 className="font-display text-2xl">Your call</h2>
                <p className="mt-1 text-sm text-muted">
                  What does the tape do after the gold marker? Indicators are optional — use only
                  what you would actually trust.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {calls.map((call) => (
                  <button
                    key={call.id}
                    type="button"
                    onClick={() => commit(call.id)}
                    className={`flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left transition ${
                      call.id === "up"
                        ? "border-up/40 bg-up/10 hover:bg-up/20"
                        : call.id === "down"
                          ? "border-down/40 bg-down/10 hover:bg-down/20"
                          : "border-border bg-raised hover:border-primary/50"
                    }`}
                  >
                    <CallIcon id={call.id} />
                    <span>
                      <span className="block text-base font-medium text-fg">{call.label}</span>
                      <span className="block text-sm text-muted">{call.hint}</span>
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <p
                className={`text-xs tracking-[0.18em] uppercase ${hit ? "text-up" : "text-down"}`}
              >
                {hit ? "Correct" : "Not this time"}
              </p>
              <h2 className="font-display text-3xl leading-none">
                {scenario.source ? scenario.source.ticker : scenario.pattern}
              </h2>
              {scenario.source && (
                <p className="text-sm text-muted tabular-nums">
                  {scenario.source.from} → {scenario.source.to} · next 20 sessions{" "}
                  <span className={scenario.source.move >= 0 ? "text-up" : "text-down"}>
                    {scenario.source.move >= 0 ? "+" : ""}
                    {scenario.source.move.toFixed(1)}%
                  </span>
                </p>
              )}
              <p className="text-sm text-muted">
                You called <span className="text-fg">{labelFor(pick)}</span>. The tape went{" "}
                <span className="text-fg">{labelFor(scenario.correct)}</span>.
              </p>
              <p className="text-sm leading-relaxed text-fg/90">{scenario.explanation}</p>
              <div className="rounded-xl bg-raised p-3">
                <p className="text-xs tracking-wide text-primary uppercase">What helped</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{scenario.indicatorNote}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scenario.useful.map((id) => {
                    const on = enabled.has(id);
                    return (
                      <span
                        key={id}
                        className={`rounded-full px-3 py-1 text-xs ${
                          on ? "bg-up/15 text-up" : "bg-bg text-muted"
                        }`}
                      >
                        {indicatorLabels[id]}
                        {on ? " · on" : " · was off"}
                      </span>
                    );
                  })}
                </div>
              </div>
              <p className="text-sm text-muted">{scenario.caution}</p>
              <button
                type="button"
                onClick={nextSetup}
                className="mt-1 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-medium text-ink"
              >
                Next setup
              </button>
            </>
          )}
        </aside>
      </section>

      <p className="text-xs text-muted">
        Educational drill on historical setups. Real charts use Yahoo Finance data, rebased to 100. A correct call here is not a reason to trade
        real money. Most day traders lose.
      </p>
    </main>
  );
}

function labelFor(direction: Direction | null) {
  if (direction === "up") return "higher";
  if (direction === "down") return "lower";
  if (direction === "sideways") return "no edge";
  return "nothing";
}

function CallIcon({ id }: { id: Direction }) {
  if (id === "up") return <TrendingUp className="text-up" size={20} />;
  if (id === "down") return <TrendingDown className="text-down" size={20} />;
  return <Minus className="text-primary" size={20} />;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-16 rounded-xl border border-border bg-surface px-3 py-2">
      <p className="text-[11px] tracking-wide text-muted uppercase">{label}</p>
      <p className="font-medium text-fg tabular-nums">{value}</p>
    </div>
  );
}

function Toggle({
  on,
  set,
  label,
}: {
  on: boolean;
  set: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      className={`min-h-10 rounded-full border px-3 text-sm transition ${
        on
          ? "border-primary/60 bg-primary/15 text-primary"
          : "border-border text-muted hover:text-fg"
      }`}
    >
      {label}
    </button>
  );
}
