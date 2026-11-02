import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Timer } from "lucide-react";
import { LearnTabs } from "@/components/learn-tabs";
import { CandleGlyph } from "@/components/candle-glyph";
import { candlePatterns, exampleCandles } from "@/lib/candles";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/candles/")({
  head: () => ({
    meta: [
      { title: "Candlestick Patterns: Hammer, Engulfing, Doji and More · Chart Pattern Trainer" },
      {
        name: "description",
        content:
          "Learn 18 candlestick patterns: hammer, shooting star, doji, marubozu, engulfing, harami, morning star and more. See when each works, then test yourself.",
      },
    ],
  }),
  component: Candles,
});

const groups = [
  { count: 1, title: "Single candle" },
  { count: 2, title: "Two candles" },
  { count: 3, title: "Three candles" },
] as const;

function Candles() {
  const progress = useProgress();
  return (
    <div className="flex flex-col gap-5">
      <LearnTabs current="candles" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Candlestick patterns</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          One to three candles that hint at who won the fight between buyers and sellers. They only mean something in
          context, so every real chart tells you whether the candle at the call actually worked.
        </p>
      </div>

      <Link
        to="/candles/quiz"
        className="flex items-center gap-3 rounded-lg border border-primary/30 bg-surface px-4 py-3 transition-colors hover:border-primary/60"
      >
        <Timer size={20} className="shrink-0 text-primary" aria-hidden />
        <span className="flex-1 text-sm">
          <strong className="font-semibold">Spot the candle</strong>{" "}
          <span className="text-muted">10 rounds, 10 seconds each. Name the pattern.</span>
        </span>
        <ArrowRight size={16} className="text-primary" aria-hidden />
      </Link>

      {groups.map((g) => (
        <section key={g.count}>
          <h2 className="label">{g.title}</h2>
          <ul className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {candlePatterns
              .filter((p) => p.count === g.count)
              .map((p) => {
                const t = progress.byTag[`candle:${p.slug}`];
                return (
                  <li key={p.slug}>
                    <Link
                      to="/candles/$slug"
                      params={{ slug: p.slug }}
                      className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-fg/40"
                    >
                      <span className="graph-paper rounded-md border border-border p-1">
                        <CandleGlyph candles={exampleCandles(p)} highlight={p.count} label={`${p.name} example`} />
                      </span>
                      <span className="font-bold leading-tight [font-stretch:88%]">{p.name}</span>
                      <span className="text-xs text-muted">{p.bias}</span>
                      {t && (
                        <span className="text-xs tabular-nums text-muted">
                          At the call: {t.hit}/{t.seen} right
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
