import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Drill } from "@/components/drill";
import { momentPacks, moments } from "@/lib/real-scenarios";
import { loadPack, savePackResult, type PackResults } from "@/lib/pack-progress";

export const Route = createFileRoute("/moments/$pack")({
  loader: ({ params }) => {
    const pack = momentPacks.find((p) => p.id === params.pack);
    if (!pack) throw notFound();
    return { pack };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.pack.name ?? "Famous Moments"} · Chart Pattern Trainer` }],
  }),
  component: Pack,
});

function Pack() {
  const { pack } = Route.useLoaderData();
  const items = moments.filter((m) => m.pack === pack.id);
  const [results, setResults] = useState<PackResults>({});
  const [pos, setPos] = useState<number | null>(null);

  useEffect(() => {
    const saved = loadPack(pack.id);
    setResults(saved);
    // Start at the first moment not played yet.
    const next = items.findIndex((m) => !(m.id in saved));
    setPos(next === -1 ? items.length : next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pack.id]);

  const right = items.filter((m) => results[m.id]).length;
  const current = pos !== null ? items[pos] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/moments" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted hover:text-fg md:min-h-0">
          <ArrowLeft size={15} aria-hidden />
          All moments
        </Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">{pack.name}</h1>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">{pack.description}</p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface px-5 py-10">
          <h2 className="text-xl font-bold [font-stretch:88%]">This pack is empty</h2>
          <p className="max-w-[48ch] text-sm text-muted">There are no charts in {pack.name} right now.</p>
          <Link to="/moments" className="inline-flex min-h-11 items-center rounded-md bg-fg px-4 font-semibold text-bg">
            All moments
          </Link>
        </div>
      ) : pos === null ? (
        <div className="min-h-[50svh]" aria-busy="true" />
      ) : current ? (
        <Drill
          key={current.id}
          scenario={current}
          deck="moments"
          label={`Moment ${pos + 1} of ${items.length}`}
          onAnswered={(r) => setResults(savePackResult(pack.id, current.id, r))}
          onNext={() => setPos(pos + 1)}
          nextLabel={pos + 1 >= items.length ? "Finish pack" : "Next moment"}
        />
      ) : (
        <div className="graph-paper flex flex-col items-start gap-3 rounded-lg border border-border px-5 py-10 md:px-8">
          <p className="text-5xl font-bold tabular-nums [font-stretch:88%]">
            {right}
            <span className="text-muted">/{items.length}</span>
          </p>
          <p className="text-lg font-semibold">
            {right === items.length ? "You'd have called every one." : "Hindsight is easier than the hard right edge."}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPos(0)}
              className="min-h-11 rounded-md border border-border bg-surface px-4 font-semibold"
            >
              Replay pack
            </button>
            <Link to="/moments" className="inline-flex min-h-11 items-center rounded-md bg-fg px-4 font-semibold text-bg">
              More moments
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
