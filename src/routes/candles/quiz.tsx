import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { CandleGlyph } from "@/components/candle-glyph";
import { candlePatterns, exampleCandles, type CandlePattern } from "@/lib/candles";
import type { Candle } from "@/lib/market";

export const Route = createFileRoute("/candles/quiz")({
  head: () => ({
    meta: [
      { title: "Spot the Candle: Candlestick Pattern Quiz · Chart Pattern Trainer" },
      {
        name: "description",
        content: "A fast candlestick quiz: ten rounds, ten seconds each. Name the hammer, engulfing, doji or morning star before time runs out.",
      },
    ],
  }),
  component: Quiz,
});

const ROUNDS = 10;
const SECONDS = 10;
const BEST_KEY = "cpt-quiz-best";

type Question = { pattern: CandlePattern; candles: Candle[]; options: CandlePattern[] };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

function buildRound(): Question[] {
  return shuffle(candlePatterns)
    .slice(0, ROUNDS)
    .map((pattern) => {
      // Wrong answers come from patterns of the same size first, so the choice is real.
      const same = shuffle(candlePatterns.filter((p) => p.slug !== pattern.slug && p.count === pattern.count));
      const other = shuffle(candlePatterns.filter((p) => p.slug !== pattern.slug && p.count !== pattern.count));
      const options = shuffle([pattern, ...[...same, ...other].slice(0, 3)]);
      return { pattern, candles: exampleCandles(pattern, Math.random), options };
    });
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  } catch {
    return 0;
  }
}

function Quiz() {
  // Built after mount: the round is random, so the server renders a placeholder.
  const [round, setRound] = useState<Question[] | null>(null);
  const [n, setN] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null); // slug, or "timeout"
  const [results, setResults] = useState<boolean[]>([]);
  const [left, setLeft] = useState(SECONDS);
  const [best, setBest] = useState(0);
  const started = useRef(0);
  const bestBefore = useRef(0);

  const start = useCallback(() => {
    bestBefore.current = loadBest();
    setRound(buildRound());
    setN(0);
    setAnswer(null);
    setResults([]);
    setLeft(SECONDS);
    started.current = performance.now();
  }, []);

  useEffect(() => {
    setBest(loadBest());
    start();
  }, [start]);

  const q = round?.[n];
  const done = round !== null && n >= ROUNDS;

  const choose = useCallback(
    (slug: string) => {
      if (!q || answer) return;
      setAnswer(slug);
      setResults((r) => [...r, slug === q.pattern.slug]);
    },
    [q, answer],
  );

  // The clock for the current question.
  useEffect(() => {
    if (!q || answer) return;
    started.current = performance.now();
    const id = window.setInterval(() => {
      const s = SECONDS - (performance.now() - started.current) / 1000;
      if (s <= 0) {
        window.clearInterval(id);
        setLeft(0);
        choose("timeout");
      } else setLeft(s);
    }, 100);
    return () => window.clearInterval(id);
  }, [q, answer, choose]);

  function next() {
    setAnswer(null);
    setLeft(SECONDS);
    setN((x) => x + 1);
  }

  useEffect(() => {
    if (!done) return;
    const score = results.filter(Boolean).length;
    if (score > best) {
      setBest(score);
      try {
        localStorage.setItem(BEST_KEY, String(score));
      } catch {
        // ignore
      }
    }
  }, [done, results, best]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link to="/candles" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fg md:min-h-0">
          <ArrowLeft size={15} aria-hidden />
          Candles
        </Link>
        <span className="text-sm tabular-nums text-muted">Best {best}/{ROUNDS}</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Spot the candle</h1>

      {!round ? (
        <div className="min-h-[50svh]" aria-busy="true" />
      ) : done ? (
        <Summary round={round} results={results} bestBefore={bestBefore.current} onAgain={start} />
      ) : q ? (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tabular-nums">
              {n + 1}/{ROUNDS}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised" aria-hidden>
              <div
                className={`h-full rounded-full ${left < 3 ? "bg-down" : "bg-fg"}`}
                style={{ width: `${(left / SECONDS) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm tabular-nums text-muted" aria-label={`${Math.ceil(left)} seconds left`}>
              {Math.ceil(left)}s
            </span>
          </div>

          <figure className="graph-paper rounded-lg border border-border p-3">
            <CandleGlyph candles={q.candles} highlight={q.pattern.count} label="Mystery candlestick pattern" />
            <figcaption className="mt-1 text-center text-xs text-muted">
              {q.pattern.count === 1 ? "Name the highlighted candle" : `Name the highlighted ${q.pattern.count} candles`}
            </figcaption>
          </figure>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Answers">
            {q.options.map((o) => {
              const isRight = o.slug === q.pattern.slug;
              const picked = answer === o.slug;
              const state = !answer ? "idle" : isRight ? "right" : picked ? "wrong" : "dim";
              return (
                <button
                  key={o.slug}
                  type="button"
                  disabled={!!answer}
                  onClick={() => choose(o.slug)}
                  className={`flex min-h-14 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-semibold transition-colors ${
                    state === "right"
                      ? "border-up bg-up/12 text-up"
                      : state === "wrong"
                        ? "border-down bg-down/10 text-down"
                        : state === "dim"
                          ? "border-border text-muted opacity-60"
                          : "border-border bg-surface hover:border-fg/40"
                  }`}
                >
                  {state === "right" && <Check size={16} aria-hidden />}
                  {state === "wrong" && <X size={16} aria-hidden />}
                  {o.name.replace(" (strong candle)", "")}
                </button>
              );
            })}
          </div>

          {answer && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4" aria-live="polite">
              <p className="text-sm">
                <strong className={answer === q.pattern.slug ? "text-up" : "text-down"}>
                  {answer === q.pattern.slug ? "Right." : answer === "timeout" ? "Time's up." : "Not quite."}
                </strong>{" "}
                It's a <strong>{q.pattern.name}</strong>. {q.pattern.summary}
              </p>
              <button
                type="button"
                onClick={next}
                autoFocus
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg"
              >
                {n + 1 >= ROUNDS ? "See your score" : "Next candle"}
                <ArrowRight size={17} aria-hidden />
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function Summary({
  round,
  results,
  bestBefore,
  onAgain,
}: {
  round: Question[];
  results: boolean[];
  bestBefore: number;
  onAgain: () => void;
}) {
  const score = results.filter(Boolean).length;
  const missed = round.filter((_, i) => !results[i]).map((q) => q.pattern);
  return (
    <div className="graph-paper flex flex-col gap-4 rounded-lg border border-border px-5 py-8">
      <p className="text-5xl font-bold tabular-nums [font-stretch:88%]">
        {score}
        <span className="text-muted">/{ROUNDS}</span>
      </p>
      <p className="text-lg font-semibold">
        {score === ROUNDS ? "Every candle named." : score >= 7 ? "Sharp eyes." : score >= 4 ? "Getting there." : "Worth a second round."}
        {score > bestBefore ? " New best." : ""}
      </p>
      {missed.length > 0 && (
        <div>
          <p className="label">Study these</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missed.map((p) => (
              <li key={p.slug}>
                <Link
                  to="/candles/$slug"
                  params={{ slug: p.slug }}
                  className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm hover:border-fg/40 md:min-h-9"
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        onClick={onAgain}
        className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-md bg-fg px-5 font-semibold text-bg"
      >
        <RotateCcw size={16} aria-hidden />
        Play again
      </button>
    </div>
  );
}
