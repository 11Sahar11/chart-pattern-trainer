import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { LearnTabs } from "@/components/learn-tabs";
import { indicatorInfo } from "@/lib/indicators";
import { useProgress } from "@/lib/progress";

export const Route = createFileRoute("/indicators/")({
  head: () => ({
    meta: [
      { title: "Technical Indicators Explained: Learn and Practice · Chart Pattern Trainer" },
      {
        name: "description",
        content:
          "Moving averages, Bollinger Bands, volume, OBV, RSI, MACD and the stochastic oscillator: what each one tells you, when it misleads, and practice charts for each.",
      },
    ],
  }),
  component: Indicators,
});

const families = ["Trend", "Volatility", "Volume", "Momentum"] as const;

function Indicators() {
  const progress = useProgress();
  return (
    <div className="flex flex-col gap-5">
      <LearnTabs current="indicators" />
      <div>
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Indicators</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          Every chart offers four of these. The skill is knowing which ones to trust on that chart, and which ones will
          mislead you.
        </p>
      </div>
      {families.map((fam) => (
        <section key={fam}>
          <h2 className="label">{fam}</h2>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {indicatorInfo
              .filter((i) => i.family === fam)
              .map((i) => {
                const t = progress.byIndicator?.[i.id];
                return (
                  <li key={i.id}>
                    <Link
                      to="/indicators/$id"
                      params={{ id: i.id }}
                      className="flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-fg/40"
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={`h-1 w-5 rounded-full ${i.swatch}`} />
                        <span className="text-lg font-bold [font-stretch:88%]">{i.short}</span>
                      </span>
                      <span className="flex-1 text-sm text-muted">{i.summary}</span>
                      <span className="flex items-center justify-between text-sm">
                        <span className="tabular-nums text-muted">
                          {t ? `Chosen right ${t.right}/${t.scored}` : "Not practiced yet"}
                        </span>
                        <ArrowRight size={15} className="text-primary" aria-hidden />
                      </span>
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
