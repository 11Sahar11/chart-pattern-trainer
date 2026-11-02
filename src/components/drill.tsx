import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Share2 } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import { indicatorLabels } from "@/lib/scenarios";
import type { Direction, IndicatorId, Scenario } from "@/lib/market";
import { recordAnswer, type DeckId } from "@/lib/progress";
import { patternForTag, tagsFor } from "@/lib/patterns";
import { shareReveal } from "@/lib/share";

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

const IND_KEY = "cpt-indicators";
const defaultOn: Record<IndicatorId, boolean> = { sma: false, ema: false, volume: true, rsi: false };

export function labelFor(direction: Direction | null) {
  if (direction === "up") return "higher";
  if (direction === "down") return "lower";
  if (direction === "sideways") return "no edge";
  return "nothing";
}

type Props = {
  scenario: Scenario;
  /** Which deck the answer counts toward in the player's stats. */
  deck: DeckId;
  /** Left side of the chart toolbar, e.g. "Setup 3 of 10". */
  label: ReactNode;
  onAnswered?: (right: boolean, pick: Direction) => void;
  onNext: () => void;
  nextLabel?: string;
  /** Hide the "learn this pattern" link (on the pattern's own page). */
  hidePatternLink?: boolean;
};

/**
 * One chart, one call. The parent keys this by scenario id, so a new setup
 * always starts unanswered.
 */
export function Drill({
  scenario,
  deck,
  label,
  onAnswered,
  onNext,
  nextLabel = "Next setup",
  hidePatternLink,
}: Props) {
  const [phase, setPhase] = useState<"read" | "revealed">("read");
  const [pick, setPick] = useState<Direction | null>(null);
  const [on, setOn] = useState(defaultOn);
  const [shareNote, setShareNote] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(IND_KEY) ?? "null") as typeof defaultOn | null;
      if (saved) setOn({ ...defaultOn, ...saved });
    } catch {
      // defaults
    }
  }, []);

  function toggle(id: IndicatorId) {
    setOn((s) => {
      const next = { ...s, [id]: !s[id] };
      try {
        localStorage.setItem(IND_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const hit = pick === scenario.correct;
  const visibleCount = phase === "read" ? scenario.revealAt : scenario.candles.length;
  const guides = useMemo(() => (phase === "revealed" ? scenario.guides : []), [phase, scenario]);
  const markerTime = scenario.candles[scenario.revealAt - 1]?.time;
  const pattern = tagsFor(scenario).map(patternForTag).find(Boolean);
  const moment = scenario.source?.title;

  const commit = useCallback(
    (direction: Direction) => {
      if (phase !== "read") return;
      const right = direction === scenario.correct;
      setPick(direction);
      setPhase("revealed");
      recordAnswer(deck, scenario, right);
      if (navigator.vibrate) {
        try {
          navigator.vibrate(right ? 18 : [12, 60, 12]);
        } catch {
          // ignore
        }
      }
      onAnswered?.(right, direction);
    },
    [phase, scenario, deck, onAnswered],
  );

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
        onNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, commit, onNext]);

  async function share() {
    if (!pick) return;
    const result = await shareReveal(scenario, pick, hit);
    setShareNote(result === "copied" ? "Copied to clipboard" : result === "failed" ? "Couldn't share from this browser" : null);
  }

  const hiddenNote = moment
    ? "Famous Moment · story hidden"
    : scenario.source
      ? "ticker and dates hidden"
      : "pattern hidden";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-2.5 md:px-4">
          <p className="text-sm">
            <span className="font-semibold tabular-nums">{label}</span>
            <span className="text-muted">
              {" · "}
              {phase === "revealed" ? (moment ?? scenario.pattern) : hiddenNote}
            </span>
          </p>
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">Indicators</legend>
            {indicators.map(({ id, swatch }) => (
              <button
                key={id}
                type="button"
                aria-pressed={on[id]}
                onClick={() => toggle(id)}
                className={`inline-flex h-10 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors md:h-8 ${
                  on[id]
                    ? "border-fg/40 bg-raised text-fg"
                    : "border-border text-muted hover:border-fg/30 hover:text-fg"
                }`}
              >
                <span aria-hidden className={`h-0.5 w-3.5 rounded-full ${swatch} ${on[id] ? "" : "opacity-40"}`} />
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

      <aside aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-5">
        {phase === "read" ? (
          <>
            <div>
              <h2 className="text-xl font-bold [font-stretch:88%]">Your call</h2>
              <p className="mt-1 text-sm text-muted">
                What does price do after the Call arrow? Add only the indicators you would actually trust.
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
            <div className="flex items-start justify-between gap-3">
              <Verdict hit={hit} />
              <button
                type="button"
                onClick={share}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-muted transition-colors hover:text-fg md:min-h-9"
              >
                <Share2 size={15} aria-hidden />
                Share
              </button>
            </div>
            {shareNote && <p className="-mt-2 text-xs text-muted">{shareNote}</p>}
            <div>
              <h2 className="text-2xl leading-tight font-bold [font-stretch:88%]">
                {moment ?? (scenario.source ? scenario.source.ticker : scenario.pattern)}
              </h2>
              {scenario.source ? (
                <p className="mt-1 text-sm text-muted tabular-nums">
                  {moment ? `${scenario.source.ticker} · ` : ""}
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
            {scenario.source?.blurb && <p className="text-sm leading-relaxed">{scenario.source.blurb}</p>}
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
            {pattern && !hidePatternLink && (
              <Link
                to="/patterns/$slug"
                params={{ slug: pattern.slug }}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                <BookOpen size={16} aria-hidden />
                How to read a {pattern.name.toLowerCase()}
              </Link>
            )}
            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg transition-opacity hover:opacity-90"
            >
              {nextLabel}
              <ArrowRight size={17} aria-hidden />
            </button>
          </>
        )}
      </aside>
    </div>
  );
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

/** The last calls as boxes on the grid: filled = hit, crossed = miss. */
export function Tally({ recent, size = 20, label }: { recent: boolean[]; size?: number; label?: string }) {
  const hits = recent.filter(Boolean).length;
  return (
    <div className="flex items-center gap-2">
      {label && <span className="label">{label}</span>}
      <ol className="flex gap-[3px]" aria-label={recent.length ? `${recent.length} calls: ${hits} hits` : "No calls yet"}>
        {Array.from({ length: size }, (_, i) => {
          const r = recent[i - (size - recent.length)];
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

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
