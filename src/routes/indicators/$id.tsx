import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Drill } from "@/components/drill";
import { availableOn, indicatorInfo, infoById } from "@/lib/indicators";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios } from "@/lib/real-scenarios";
import type { IndicatorId } from "@/lib/market";

export const Route = createFileRoute("/indicators/$id")({
  loader: ({ params }) => {
    const info = infoById.get(params.id as IndicatorId);
    if (!info) throw notFound();
    return { info };
  },
  head: ({ loaderData }) => {
    const i = loaderData?.info;
    if (!i) return {};
    return {
      meta: [
        { title: `${i.name}: How to Read It, and Practice · Chart Pattern Trainer` },
        { name: "description", content: i.summary },
      ],
    };
  },
  component: IndicatorPage,
});

function IndicatorPage() {
  const { info } = Route.useLoaderData();
  // Only charts long enough to draw this indicator (SMA 50 needs 50 candles).
  const pool = useMemo(() => {
    const all = [...practiceScenarios, ...realScenarios.slice(0, 60)];
    const ok = all.filter((s) => availableOn(s, info.id));
    return ok.length ? ok : all;
  }, [info.id]);
  // Start somewhere stable per indicator so server and client render the same chart.
  const start = indicatorInfo.findIndex((i) => i.id === info.id) * 3;
  const [n, setN] = useState(0);
  const scenario = pool[(start + n * 7) % pool.length];
  const i = indicatorInfo.findIndex((x) => x.id === info.id);
  const next = indicatorInfo[(i + 1) % indicatorInfo.length];

  return (
    <article className="flex flex-col gap-8">
      <header>
        <Link to="/indicators" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fg md:min-h-0">
          <ArrowLeft size={15} aria-hidden />
          All indicators
        </Link>
        <p className="label mt-2">{info.family}</p>
        <h1 className="mt-1 flex items-center gap-3 text-3xl font-bold tracking-tight [font-stretch:88%] md:text-4xl">
          <span aria-hidden className={`h-1.5 w-7 rounded-full ${info.swatch}`} />
          {info.name}
        </h1>
        <p className="mt-3 max-w-[65ch] text-base leading-relaxed">{info.whatItIs}</p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold [font-stretch:88%]">How to read it</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed">
            {info.howToRead.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fg" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold [font-stretch:88%]">When it misleads</h2>
          <p className="mt-2 text-[15px] leading-relaxed">{info.pitfalls}</p>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-xl font-bold [font-stretch:88%]">Practice: is {info.short} useful here?</h2>
          <p className="mt-1 text-sm text-muted">
            {info.short} is always one of the four on these charts. Decide whether to trust it, then call the move.
          </p>
        </div>
        <Drill
          key={`${scenario.id}-${n}`}
          scenario={scenario}
          deck="pattern"
          label={`${info.short} drill ${n + 1}`}
          includeIndicator={info.id}
          onNext={() => setN((x) => x + 1)}
          nextLabel="Another chart"
        />
        <Link
          to="/indicators/$id"
          params={{ id: next.id }}
          className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-md border border-border bg-surface px-4 font-semibold"
        >
          Next: {next.short}
          <ArrowRight size={16} aria-hidden />
        </Link>
      </section>
    </article>
  );
}
