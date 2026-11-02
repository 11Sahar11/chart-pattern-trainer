import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Timer } from "lucide-react";
import { CandleGlyph } from "@/components/candle-glyph";
import { candleBySlug, candlePatterns, exampleCandles } from "@/lib/candles";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/candles/$slug")({
  loader: ({ params }) => {
    const pattern = candleBySlug.get(params.slug);
    if (!pattern) throw notFound();
    return { pattern };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.pattern;
    if (!p) return {};
    return {
      meta: [
        { title: `${p.name} Candlestick Pattern: Meaning and When It Works · Chart Pattern Trainer` },
        { name: "description", content: p.summary },
      ],
    };
  },
  component: CandlePage,
});

function CandlePage() {
  const { pattern: p } = Route.useLoaderData();
  const progress = useProgress();
  const t = progress.byTag[`candle:${p.slug}`];
  const i = candlePatterns.findIndex((x) => x.slug === p.slug);
  const next = candlePatterns[(i + 1) % candlePatterns.length];
  const related = candlePatterns.filter((x) => x.slug !== p.slug && x.count === p.count);

  return (
    <article className="flex flex-col gap-8">
      <header className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px] md:items-start">
        <div>
          <Link to="/candles" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fg md:min-h-0">
            <ArrowLeft size={15} aria-hidden />
            All candlestick patterns
          </Link>
          <p className="label mt-2">
            {p.bias} · {p.count === 1 ? "single candle" : `${p.count} candles`}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight [font-stretch:88%] md:text-4xl">{p.name}</h1>
          <p className="mt-3 max-w-[60ch] text-base leading-relaxed">{p.whatItIs}</p>
        </div>
        <figure className="graph-paper rounded-lg border border-border p-3">
          <CandleGlyph candles={exampleCandles(p)} highlight={p.count} label={`${p.name}: example drawing`} />
          <figcaption className="mt-1 text-center text-xs text-muted">
            Lead-in faded; the pattern is highlighted.
          </figcaption>
        </figure>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold [font-stretch:88%]">How to spot it</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed">
            {p.howToSpot.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fg" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold [font-stretch:88%]">When it counts</h2>
            <p className="mt-2 text-[15px] leading-relaxed">{p.context}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold [font-stretch:88%]">How it fails</h2>
            <p className="mt-2 text-[15px] leading-relaxed">{p.failure}</p>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
        <h2 className="text-lg font-bold [font-stretch:88%]">Your record with it</h2>
        <p className="text-sm text-muted">
          {t
            ? `When a ${p.name.toLowerCase()} formed at the call, you called the chart right ${t.hit} of ${t.seen} times.`
            : `When a ${p.name.toLowerCase()} forms right at the call on a chart you play, the reveal marks it and tells you whether it worked. Your record shows up here.`}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link to="/candles/quiz" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg">
            <Timer size={16} aria-hidden />
            Spot the candle
          </Link>
          <Link
            to="/candles/$slug"
            params={{ slug: next.slug }}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-surface px-4 font-semibold"
          >
            Next: {next.name}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <nav aria-label="Similar patterns" className="border-t border-border pt-6">
        <h2 className="label">Other {p.count === 1 ? "single-candle" : `${p.count}-candle`} patterns</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {related.map((r) => (
            <li key={r.slug}>
              <Link
                to="/candles/$slug"
                params={{ slug: r.slug }}
                className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm hover:border-fg/40 md:min-h-9"
              >
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
