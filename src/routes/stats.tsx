import { createFileRoute, Link } from "@tanstack/react-router";
import { Snowflake } from "lucide-react";
import { Stat } from "@/components/drill";
import { patternForTag, tagLabels } from "@/lib/patterns";
import { dateKey, liveStreak, useProgress, type DeckId } from "@/lib/progress";
import { scenarioById } from "@/lib/real-scenarios";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Your stats · Chart Pattern Trainer" }] }),
  component: Stats,
});

const deckNames: Record<DeckId, string> = {
  practice: "Practice",
  real: "Real charts",
  review: "Review",
  moments: "Famous Moments",
  daily: "Daily Chart",
  pattern: "Pattern pages",
};

/** Fewer calls than this and a percentage says nothing yet. */
const MIN_SEEN = 3;

function Stats() {
  const p = useProgress();
  const decks = Object.entries(p.decks) as [DeckId, NonNullable<(typeof p.decks)[DeckId]>][];
  const total = decks.reduce((a, [, d]) => a + d.total, 0);
  const correct = decks.reduce((a, [, d]) => a + d.correct, 0);
  const tags = Object.entries(p.byTag)
    .map(([tag, t]) => ({ tag, ...t, rate: t.seen ? t.hit / t.seen : 0 }))
    .sort((a, b) => b.seen - a.seen);
  const ranked = tags.filter((t) => t.seen >= MIN_SEEN).sort((a, b) => a.rate - b.rate);
  const weakest = ranked[0];
  const weakestPattern = weakest ? patternForTag(weakest.tag) : undefined;
  const misses = p.misses.filter((id) => scenarioById.has(id)).length;
  const streak = liveStreak(p, dateKey());

  if (total === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Your stats</h1>
        <div className="graph-paper flex flex-col items-start gap-3 rounded-lg border border-border px-5 py-10 md:px-8">
          <p className="max-w-[52ch] text-sm text-muted">
            Your accuracy by pattern, your streak and your weak spots show up here after your first calls. Everything
            stays on this device.
          </p>
          <Link to="/daily" className="inline-flex min-h-11 items-center rounded-md bg-fg px-4 font-semibold text-bg">
            Play today's Daily Chart
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Your stats</h1>

      <section className="flex flex-wrap gap-x-8 gap-y-4 rounded-lg border border-border bg-surface p-4 md:p-5">
        <dl className="flex flex-wrap gap-x-8 gap-y-4">
          <Stat label="Calls" value={String(total)} />
          <Stat label="Hit rate" value={`${Math.round((correct / total) * 100)}%`} />
          <Stat label="Daily streak" value={`${streak} ${streak === 1 ? "day" : "days"}`} />
          <Stat label="Best streak" value={`${p.days.best} ${p.days.best === 1 ? "day" : "days"}`} />
        </dl>
        <p className="flex items-center gap-1.5 self-end text-sm text-muted">
          <Snowflake size={14} aria-hidden />
          {p.days.freezes} streak {p.days.freezes === 1 ? "freeze" : "freezes"}
        </p>
      </section>

      {(weakest || misses > 0) && (
        <section className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-surface p-4 md:p-5">
          <h2 className="text-lg font-bold [font-stretch:88%]">Work on next</h2>
          {weakest && (
            <p className="text-sm">
              Your weakest read is <strong>{tagLabels[weakest.tag] ?? weakest.tag}</strong>:{" "}
              {weakest.hit} of {weakest.seen} right.
              {weakestPattern && (
                <>
                  {" "}
                  <Link
                    to="/patterns/$slug"
                    params={{ slug: weakestPattern.slug }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Study the {weakestPattern.name.toLowerCase()}
                  </Link>
                </>
              )}
            </p>
          )}
          {misses > 0 && (
            <p className="text-sm">
              {misses} {misses === 1 ? "chart is" : "charts are"} waiting in{" "}
              <Link to="/" className="font-semibold text-primary hover:underline">
                Review misses
              </Link>
              .
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold [font-stretch:88%]">Accuracy by pattern and condition</h2>
        <p className="mt-1 text-sm text-muted">Shown once you have {MIN_SEEN} or more calls on it.</p>
        <ul className="mt-4 flex flex-col gap-3">
          {tags.map((t) => {
            const pct = Math.round(t.rate * 100);
            const enough = t.seen >= MIN_SEEN;
            return (
              <li key={t.tag} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
                <span className="truncate text-sm font-medium">{tagLabels[t.tag] ?? t.tag}</span>
                <span className="text-sm tabular-nums text-muted">
                  {t.hit}/{t.seen}
                  {enough ? ` · ${pct}%` : ""}
                </span>
                <span className="col-span-2 h-2 overflow-hidden rounded-full bg-raised">
                  <span
                    className={`block h-full rounded-full ${enough ? (pct >= 60 ? "bg-up" : pct >= 40 ? "bg-fg" : "bg-down") : "bg-border"}`}
                    style={{ width: `${enough ? Math.max(pct, 2) : 100}%` }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-bold [font-stretch:88%]">By deck</h2>
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
          {decks
            .filter(([, d]) => d.total > 0)
            .map(([id, d]) => (
              <li key={id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium">{deckNames[id]}</span>
                <span className="tabular-nums text-muted">
                  {d.correct}/{d.total} · {Math.round((d.correct / d.total) * 100)}% · best run {d.best}
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
