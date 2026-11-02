import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Drill } from "@/components/drill";
import { patternBySlug, patterns } from "@/lib/patterns";
import { scenarios } from "@/lib/scenarios";

export const Route = createFileRoute("/patterns/$slug")({
  loader: ({ params }) => {
    const pattern = patternBySlug.get(params.slug);
    if (!pattern) throw notFound();
    return { pattern };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.pattern;
    if (!p) return {};
    const title = `${p.name} Pattern: How to Spot It, and Practice · Chart Pattern Trainer`;
    return {
      meta: [
        { title },
        { name: "description", content: p.summary },
        { property: "og:title", content: `${p.name}: can you call the move?` },
        { property: "og:description", content: p.summary },
      ],
    };
  },
  component: PatternPage,
});

function PatternPage() {
  const { pattern } = Route.useLoaderData();
  const scenario = scenarios.find((s) => s.id === pattern.scenarioId);
  const [round, setRound] = useState(0);
  const others = patterns.filter((p) => p.slug !== pattern.slug);
  const i = patterns.findIndex((p) => p.slug === pattern.slug);
  const next = patterns[(i + 1) % patterns.length];

  return (
    <article className="flex flex-col gap-8">
      <header>
        <Link to="/patterns" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fg md:min-h-0">
          <ArrowLeft size={15} aria-hidden />
          All patterns
        </Link>
        <p className="label mt-2">{pattern.bias}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight [font-stretch:88%] md:text-4xl">{pattern.name} pattern</h1>
        <p className="mt-3 max-w-[65ch] text-base leading-relaxed">{pattern.whatItIs}</p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="text-xl font-bold [font-stretch:88%]">How to spot it</h2>
          <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed">
            {pattern.howToSpot.map((line) => (
              <li key={line} className="flex gap-3">
                <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-fg" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold [font-stretch:88%]">What confirms it</h2>
            <p className="mt-2 text-[15px] leading-relaxed">{pattern.confirmation}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold [font-stretch:88%]">How it fails</h2>
            <p className="mt-2 text-[15px] leading-relaxed">{pattern.failure}</p>
          </div>
          <div>
            <h2 className="text-xl font-bold [font-stretch:88%]">Indicators that help</h2>
            <p className="mt-2 text-[15px] leading-relaxed">{pattern.indicators}</p>
          </div>
        </section>
      </div>

      {scenario && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-xl font-bold [font-stretch:88%]">Practice: call this chart</h2>
            <p className="mt-1 text-sm text-muted">The chart stops before the move. What happens next?</p>
          </div>
          <Drill
            key={`${scenario.id}-${round}`}
            scenario={scenario}
            deck="pattern"
            label={pattern.name}
            hidePatternLink
            onNext={() => setRound((r) => r + 1)}
            nextLabel="Try it again"
          />
          <div className="flex flex-wrap gap-2">
            <Link to="/" className="inline-flex min-h-11 items-center rounded-md bg-fg px-4 font-semibold text-bg">
              Train on more charts
            </Link>
            <Link
              to="/patterns/$slug"
              params={{ slug: next.slug }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border bg-surface px-4 font-semibold"
            >
              Next: {next.name}
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      )}

      <nav aria-label="Other patterns" className="border-t border-border pt-6">
        <h2 className="label">Other patterns</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {others.map((p) => (
            <li key={p.slug}>
              <Link
                to="/patterns/$slug"
                params={{ slug: p.slug }}
                className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-3 text-sm hover:border-fg/40 md:min-h-9"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
