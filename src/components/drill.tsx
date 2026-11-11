import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, Check, ChevronDown, Share2, X } from "lucide-react";
import { PriceChart } from "@/components/price-chart";
import { chartSentence } from "@/lib/chart-copy";
import type { Direction, IndicatorId, Scenario } from "@/lib/market";
import { recordAnswer, type DeckId } from "@/lib/progress";
import { patternForTag, tagsFor } from "@/lib/patterns";
import { infoById, offeredFor, pickWasRight, readText, verdictFor, type Verdict } from "@/lib/indicators";
import { shareReveal } from "@/lib/share";
import { inFirstSession } from "@/lib/session";
import { candleOutcome, detectAt, type CandleMatch } from "@/lib/candles";

const calls: { id: Direction; label: string; hint: string; key: string }[] = [
  { id: "up", label: "Higher", hint: "Next swing resolves up", key: "↑" },
  { id: "down", label: "Lower", hint: "Next swing resolves down", key: "↓" },
  { id: "sideways", label: "No edge", hint: "Range, or not clear yet", key: "N" },
];

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
  /** Always offer this indicator (on its lesson page). */
  includeIndicator?: IndicatorId;
};

/**
 * One chart, one call. Each chart offers four indicators; the player turns on
 * the ones they would trust, then calls the move. The reveal scores both.
 * The parent keys this by scenario id, so a new setup always starts fresh.
 */
export function Drill({
  scenario,
  deck,
  label,
  onAnswered,
  onNext,
  nextLabel = "Next setup",
  hidePatternLink,
  includeIndicator,
}: Props) {
  const [phase, setPhase] = useState<"read" | "revealed">("read");
  const [pick, setPick] = useState<Direction | null>(null);
  const offered = useMemo(() => offeredFor(scenario, includeIndicator), [scenario, includeIndicator]);
  const [on, setOn] = useState<IndicatorId[]>(includeIndicator ? [includeIndicator] : []);
  const [shareNote, setShareNote] = useState<string | null>(null);

  const hit = pick === scenario.correct;
  const visibleCount = phase === "read" ? scenario.revealAt : scenario.candles.length;
  const guides = useMemo(() => (phase === "revealed" ? scenario.guides : []), [phase, scenario]);
  const markerTime = scenario.candles[scenario.revealAt - 1]?.time;
  const pattern = tagsFor(scenario).map(patternForTag).find(Boolean);
  const moment = scenario.source?.title;
  const active = offered.filter((id) => on.includes(id));
  // The candlestick pattern formed by the last candles before the call, if any.
  const candle = useMemo(() => detectAt(scenario.candles, scenario.revealAt - 1), [scenario]);
  const highlight = useMemo(
    () =>
      phase === "revealed" && candle
        ? {
            times: scenario.candles.slice(candle.start, candle.end + 1).map((c) => c.time),
            label: candle.pattern.short,
          }
        : undefined,
    [phase, candle, scenario],
  );

  // After the call the player can still switch indicators to look; only the
  // set that was on at the moment of the call is scored.
  function toggle(id: IndicatorId) {
    setOn((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  const [usedAtCall, setUsedAtCall] = useState<IndicatorId[]>([]);
  const [hints, setHints] = useState(false);
  useEffect(() => setHints(inFirstSession()), []);

  const commit = useCallback(
    (direction: Direction) => {
      if (phase !== "read") return;
      const right = direction === scenario.correct;
      setPick(direction);
      setPhase("revealed");
      setUsedAtCall(on);
      recordAnswer(
        deck,
        scenario,
        right,
        offered.map((id) => ({ id, right: pickWasRight(verdictFor(scenario, id), on.includes(id)) })),
      );
      if (navigator.vibrate) {
        try {
          navigator.vibrate(right ? 18 : [12, 60, 12]);
        } catch {
          // ignore
        }
      }
      onAnswered?.(right, direction);
    },
    [phase, scenario, deck, onAnswered, on, offered],
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

  const hiddenNote = moment ? "story hidden" : scenario.source ? "ticker hidden" : "pattern hidden";
  const scored = offered
    .map((id) => pickWasRight(verdictFor(scenario, id), usedAtCall.includes(id)))
    .filter((r): r is boolean => r !== null);

  return (
    <>
    <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-4">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <p className="truncate border-b border-border px-3 py-2 text-sm md:px-4">
          <span className="font-semibold tabular-nums">{label}</span>
          <span className="text-muted">
            {" · "}
            {phase === "revealed" ? (moment ?? scenario.source?.ticker ?? scenario.pattern) : hiddenNote}
          </span>
        </p>
        <PriceChart
          candles={scenario.candles}
          visibleCount={visibleCount}
          active={active}
          guides={guides}
          markerTime={markerTime}
          highlight={highlight}
          compact={phase === "revealed"}
        />
        <fieldset className="border-t border-border px-3 py-2.5 md:px-4">
          <legend className="sr-only">Indicators offered on this chart</legend>
          <p className="label mb-2">
            {phase === "read" ? "Turn on the indicators you'd trust" : "Indicators on this chart"}
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {offered.map((id) => {
              const info = infoById.get(id)!;
              const isOn = on.includes(id);
              const verdict = phase === "revealed" ? verdictFor(scenario, id) : null;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => toggle(id)}
                  className={`relative flex min-h-11 items-center justify-center gap-1.5 rounded-md border px-1 text-xs font-semibold transition-colors md:min-h-9 ${
                    isOn ? "border-fg/50 bg-raised text-fg" : "border-border text-muted hover:border-fg/30 hover:text-fg"
                  }`}
                >
                  <span aria-hidden className={`h-0.5 w-3 shrink-0 rounded-full ${info.swatch} ${isOn ? "" : "opacity-40"}`} />
                  <span className="truncate">{info.chip}</span>
                  {verdict && <VerdictDot verdict={verdict} />}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <aside aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 md:gap-4 md:p-5">
        {phase === "read" ? (
          <>
            <h2 className="hidden text-xl font-bold [font-stretch:88%] lg:block">Your call</h2>
            <p className="hidden text-sm text-muted lg:block">What does price do after the Call arrow?</p>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {calls.map((call) => (
                <button
                  key={call.id}
                  type="button"
                  onClick={() => commit(call.id)}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border bg-surface px-2 text-center transition-colors lg:min-h-14 lg:flex-row lg:justify-start lg:gap-3 lg:px-3.5 lg:text-left ${
                    call.id === "up"
                      ? "border-up/45 hover:bg-up/8"
                      : call.id === "down"
                        ? "border-down/45 hover:bg-down/8"
                        : "border-border hover:bg-raised"
                  }`}
                >
                  <CallIcon id={call.id} />
                  <span className="lg:flex-1">
                    <span className="block text-sm font-semibold lg:text-base">{call.label}</span>
                    <span className={`text-[11px] leading-tight text-muted lg:text-sm ${hints ? "block" : "hidden lg:block"}`}>
                      {call.hint}
                    </span>
                  </span>
                  <kbd className="hidden h-6 min-w-6 items-center justify-center rounded border border-border px-1.5 text-muted lg:inline-flex">
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
                aria-label="Share this call"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium text-muted transition-colors hover:text-fg md:min-h-9"
              >
                <Share2 size={15} aria-hidden />
                Share
              </button>
            </div>
            {shareNote && <p className="-mt-2 text-xs text-muted">{shareNote}</p>}
            <p className="text-sm leading-snug">{chartSentence(scenario)}</p>
            <p className="text-sm">
              You called <strong>{labelFor(pick)}</strong>. It went{" "}
              <strong className={scenario.correct === "up" ? "text-up" : scenario.correct === "down" ? "text-down" : ""}>
                {labelFor(scenario.correct)}
              </strong>
              .
            </p>

            <IndicatorSummary scenario={scenario} offered={offered} usedAtCall={usedAtCall} scored={scored} />

            <details className="group rounded-md border border-border">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-sm font-semibold">
                Why it moved
                <ChevronDown size={16} className="text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="flex flex-col gap-3 border-t border-border px-3 py-3 text-sm leading-relaxed">
                {scenario.source ? (
                  <p className="text-muted tabular-nums">
                    {scenario.source.ticker}
                    {" · "}
                    {scenario.source.from} → {scenario.source.to}
                    {" · "}
                    <span className={`font-semibold ${scenario.source.move >= 0 ? "text-up" : "text-down"}`}>
                      {scenario.source.move >= 0 ? "+" : ""}
                      {scenario.source.move.toFixed(1)}%
                    </span>
                  </p>
                ) : (
                  <p className="font-semibold">{scenario.pattern}</p>
                )}
                {candle && <CandleAtCall match={candle} actual={scenario.correct} />}
                {scenario.source?.blurb && <p>{scenario.source.blurb}</p>}
                <p>{scenario.explanation}</p>
                <p className="text-muted">{scenario.indicatorNote}</p>
                <p className="text-muted">{scenario.caution}</p>
                {pattern && !hidePatternLink && (
                  <Link
                    to="/patterns/$slug"
                    params={{ slug: pattern.slug }}
                    className="inline-flex min-h-11 items-center gap-2 font-medium text-primary underline-offset-2 hover:underline"
                  >
                    <BookOpen size={16} aria-hidden />
                    How to read a {pattern.name.toLowerCase()}
                  </Link>
                )}
              </div>
            </details>

            <button
              type="button"
              onClick={onNext}
              className="hidden min-h-12 items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg transition-opacity hover:opacity-90 md:inline-flex"
            >
              {nextLabel}
              <ArrowRight size={17} aria-hidden />
            </button>
          </>
        )}
      </aside>
    </div>
    {phase === "revealed" && (
      <div
        className="fixed inset-x-0 z-40 border-t border-border bg-bg/95 px-3 py-2 backdrop-blur-sm md:hidden"
        style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={onNext}
          className="mx-auto inline-flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg"
        >
          {nextLabel}
          <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    )}
    {phase === "revealed" && <div className="h-16 md:hidden" aria-hidden />}
    </>
  );
}

function IndicatorSummary({
  scenario,
  offered,
  usedAtCall,
  scored,
}: {
  scenario: Scenario;
  offered: IndicatorId[];
  usedAtCall: IndicatorId[];
  scored: boolean[];
}) {
  const [open, setOpen] = useState(false);
  const right = scored.filter(Boolean).length;
  const label = scored.length > 0 ? `${right}/${scored.length} right` : "No clear signal";
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-sm font-semibold"
      >
        <span>Indicators</span>
        <span className={`inline-flex items-center gap-1 tabular-nums ${right === scored.length && scored.length > 0 ? "text-up" : ""}`}>
          {label}
          <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>
      {open && (
        <ul className="flex flex-col gap-2 border-t border-border px-3 py-3">
          {offered.map((id) => {
            const v = verdictFor(scenario, id);
            const used = usedAtCall.includes(id);
            const ok = pickWasRight(v, used);
            return (
              <li key={id} className="flex gap-2.5 text-sm">
                <span className="mt-0.5 shrink-0">
                  {ok === null ? (
                    <span aria-label="Not scored" className="block h-4 w-4 rounded-full border border-border" />
                  ) : ok ? (
                    <Check size={16} className="text-up" aria-label="Right choice" />
                  ) : (
                    <X size={16} className="text-down" aria-label="Wrong choice" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="font-semibold">{infoById.get(id)?.short}</span>{" "}
                  <span className="text-muted">
                    {v === "helped" ? "helped" : v === "misled" ? "misled" : "no clear signal"} · {used ? "you used it" : "you left it off"}
                  </span>
                  <span className="block text-xs text-muted">{readText(scenario, id)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CandleAtCall({ match, actual }: { match: CandleMatch; actual: Direction }) {
  const outcome = candleOutcome(match, actual);
  const word =
    match.points === "up" ? "pointed higher" : match.points === "down" ? "pointed lower" : "signals indecision";
  return (
    <Link
      to="/candles/$slug"
      params={{ slug: match.pattern.slug }}
      className="flex items-start gap-3 rounded-md border border-border p-3 text-sm transition-colors hover:border-fg/40"
    >
      <span
        aria-hidden
        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
          outcome === "worked" ? "bg-up" : outcome === "failed" ? "bg-down" : "bg-border"
        }`}
      />
      <span className="flex-1">
        <span className="font-semibold">Candle at the call: {match.pattern.name}</span>
        <span className="block text-muted">
          It {word}.{" "}
          {outcome === "worked" ? "It worked." : outcome === "failed" ? "It failed this time." : "Price went its own way."}
        </span>
      </span>
      <ArrowRight size={15} className="mt-1 shrink-0 text-primary" aria-hidden />
    </Link>
  );
}

function VerdictDot({ verdict }: { verdict: Verdict }) {
  const cls = verdict === "helped" ? "bg-up" : verdict === "misled" ? "bg-down" : "bg-border";
  const text = verdict === "helped" ? "helped" : verdict === "misled" ? "misled" : "no signal";
  return (
    <span className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ring-2 ring-surface ${cls}`}>
      <span className="sr-only">{text}</span>
    </span>
  );
}

function CallIcon({ id }: { id: Direction }) {
  const cls = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md lg:h-9 lg:w-9";
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
      {label && <span className="label whitespace-nowrap">{label}</span>}
      <ol className="flex gap-[2px] md:gap-[3px]" aria-label={recent.length ? `${recent.length} calls: ${hits} hits` : "No calls yet"}>
        {Array.from({ length: size }, (_, i) => {
          const r = recent[i - (size - recent.length)];
          return (
            <li
              key={i}
              className={`relative h-3 w-3 rounded-[2px] border md:h-3.5 md:w-3.5 ${
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
