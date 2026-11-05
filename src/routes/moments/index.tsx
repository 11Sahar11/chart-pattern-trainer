import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { momentPacks, moments } from "@/lib/real-scenarios";
import { loadPack, type PackResults } from "@/lib/pack-progress";

export const Route = createFileRoute("/moments/")({
  head: () => ({
    meta: [
      { title: "Famous Moments · Chart Pattern Trainer" },
      {
        name: "description",
        content:
          "The COVID crash, the GameStop squeeze, NVIDIA's AI gap. Real charts from market history with the story hidden. Would you have called it?",
      },
    ],
  }),
  component: Moments,
});

function Moments() {
  const [results, setResults] = useState<Record<string, PackResults>>({});
  useEffect(() => {
    setResults(Object.fromEntries(momentPacks.map((p) => [p.id, loadPack(p.id)])));
  }, []);

  const packs = momentPacks.filter((pack) => moments.some((m) => m.pack === pack.id));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Famous Moments</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          Real charts from market history, stopped right before the move everyone remembers. The ticker and the story
          stay hidden until you call it.
        </p>
      </div>

      {packs.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface px-5 py-8">
          <h2 className="text-xl font-bold [font-stretch:88%]">No moments to play yet</h2>
          <p className="max-w-[52ch] text-sm text-muted">
            Historical packs will show up here when they are ready. Textbook setups and the daily chart are ready now.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/" className="inline-flex min-h-11 items-center rounded-md bg-fg px-4 text-sm font-semibold text-bg">
              Practice
            </Link>
            <Link
              to="/daily"
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold"
            >
              Daily chart
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {packs.map((pack) => {
            const items = moments.filter((m) => m.pack === pack.id);
            const r = results[pack.id] ?? {};
            const played = items.filter((m) => m.id in r).length;
            const right = items.filter((m) => r[m.id]).length;
            return (
              <li key={pack.id}>
                <Link
                  to="/moments/$pack"
                  params={{ pack: pack.id }}
                  className="graph-paper flex h-full flex-col gap-3 rounded-lg border border-border p-5 transition-colors hover:border-fg/40"
                >
                  <span className="text-xl font-bold [font-stretch:88%]">{pack.name}</span>
                  <span className="flex-1 text-sm text-muted">{pack.description}</span>
                  <span className="flex items-center justify-between text-sm">
                    <span className="tabular-nums text-muted">
                      {played === 0 ? `${items.length} charts` : `${right}/${items.length} called right`}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      {played > 0 && played < items.length ? "Continue" : played === items.length ? "Replay" : "Play"}
                      <ArrowRight size={15} aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
