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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Famous Moments</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">
          Real charts from market history, stopped right before the move everyone remembers. The ticker and the story
          stay hidden until you call it.
        </p>
      </div>

      {moments.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">
          Moments are built with the real-chart data. Run <code className="font-semibold text-fg">npm run data:yahoo</code>{" "}
          once and they appear here.
        </p>
      ) : null}

      <ul className="grid gap-3 md:grid-cols-3">
        {momentPacks.map((pack) => {
          const items = moments.filter((m) => m.pack === pack.id);
          const r = results[pack.id] ?? {};
          const played = items.filter((m) => m.id in r).length;
          const right = items.filter((m) => r[m.id]).length;
          return (
            <li key={pack.id}>
              <Link
                to="/moments/$pack"
                params={{ pack: pack.id }}
                disabled={items.length === 0}
                className="graph-paper flex h-full flex-col gap-3 rounded-lg border border-border p-5 transition-colors hover:border-fg/40 aria-disabled:pointer-events-none aria-disabled:opacity-60"
              >
                <span className="text-xl font-bold [font-stretch:88%]">{pack.name}</span>
                <span className="flex-1 text-sm text-muted">{pack.description}</span>
                <span className="flex items-center justify-between text-sm">
                  <span className="tabular-nums text-muted">
                    {items.length === 0
                      ? "Not built yet"
                      : played === 0
                        ? `${items.length} charts`
                        : `${right}/${items.length} called right`}
                  </span>
                  {items.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-semibold text-primary">
                      {played > 0 && played < items.length ? "Continue" : played === items.length ? "Replay" : "Play"}
                      <ArrowRight size={15} aria-hidden />
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
