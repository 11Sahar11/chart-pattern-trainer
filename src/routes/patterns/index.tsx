import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { patterns } from "@/lib/patterns";
import { LearnTabs } from "@/components/learn-tabs";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/patterns/")({
  head: () => ({
    meta: [
      { title: "Stock Chart Patterns: Learn and Practice · Chart Pattern Trainer" },
      {
        name: "description",
        content:
          "Head and shoulders, double tops, triangles, bull flags, RSI divergence and gaps. Learn what each chart pattern means, then practice calling the move.",
      },
    ],
  }),
  component: Patterns,
});

function Patterns() {
  const progress = useProgress();
  return (
    <div className="flex flex-col gap-5">
      <LearnTabs current="patterns" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Chart patterns</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          What each pattern looks like, what confirms it, and how it fails. Every page ends with a chart you can call.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {patterns.map((p) => {
          const t = progress.byTag[p.slug];
          return (
            <li key={p.slug}>
              <Link
                to="/patterns/$slug"
                params={{ slug: p.slug }}
                className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-fg/40"
              >
                <span className="label">{p.bias}</span>
                <span className="text-lg font-bold [font-stretch:88%]">{p.name}</span>
                <span className="flex-1 text-sm text-muted">{p.whatItIs.split(". ")[0]}.</span>
                <span className="flex items-center justify-between text-sm">
                  <span className="tabular-nums text-muted">{t ? `${t.hit}/${t.seen} called right` : "Not practiced yet"}</span>
                  <ArrowRight size={15} className="text-primary" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
