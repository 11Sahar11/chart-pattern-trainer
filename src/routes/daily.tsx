import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Share2, Snowflake } from "lucide-react";
import { Drill, Tally } from "@/components/drill";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import { realScenarios } from "@/lib/real-scenarios";
import type { Scenario } from "@/lib/market";
import { DAILY_SIZE, dateKey, daysBetween, liveStreak, recordDaily, useProgress } from "@/lib/progress";
import { shareText } from "@/lib/share";

/** Daily #1 is the launch day. */
const FIRST_DAY = "2026-11-02";

export const Route = createFileRoute("/daily")({
  head: () => ({
    meta: [
      { title: "Daily Chart · Chart Pattern Trainer" },
      {
        name: "description",
        content: "Five stock charts a day, the same for everyone. Call each move, keep your streak, share your score.",
      },
    ],
  }),
  component: Daily,
});

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The same five charts for every player on a given date. */
function dailySet(dayNumber: number): Scenario[] {
  const pool = realScenarios.length >= 30 ? realScenarios : [...practiceScenarios, ...realScenarios];
  const rand = mulberry32(dayNumber * 2654435761);
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, DAILY_SIZE).map((i) => pool[i]);
}

function Daily() {
  const progress = useProgress();
  // The date is only known in the browser; render nothing date-specific on the server.
  const [today, setToday] = useState<string | null>(null);
  // Which of the five charts is on screen. It stays put while a reveal is showing.
  const [view, setView] = useState<number | null>(null);
  useEffect(() => setToday(dateKey()), []);

  const dayNumber = today ? daysBetween(FIRST_DAY, today) + 1 : 0;
  const set = useMemo(() => (dayNumber ? dailySet(dayNumber) : []), [dayNumber]);
  const results = today ? (progress.daily[today] ?? []) : [];

  // Resume where the player left off, once saved progress is available.
  useEffect(() => {
    if (today && view === null) setView(Math.min(results.length, DAILY_SIZE));
  }, [today, view, results.length]);

  if (!today || view === null) return <div className="min-h-[60svh]" aria-busy="true" />;

  const current = view < DAILY_SIZE ? set[view] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight [font-stretch:88%] md:text-3xl">Daily Chart #{dayNumber}</h1>
          <p className="mt-1 text-sm text-muted">Five charts, the same for everyone today. New set at midnight.</p>
        </div>
        <Tally recent={results} size={DAILY_SIZE} />
      </div>

      {current ? (
        <Drill
          key={`${today}-${view}`}
          scenario={current}
          deck="daily"
          label={`Chart ${view + 1} of ${DAILY_SIZE}`}
          onAnswered={(right) => recordDaily(today, [...results.slice(0, view), right])}
          onNext={() => setView(view + 1)}
          nextLabel={view + 1 >= DAILY_SIZE ? "See today's score" : "Next chart"}
        />
      ) : (
        <Summary
          dayNumber={dayNumber}
          results={results}
          set={set}
          streak={liveStreak(progress, today)}
          freezes={progress.days.freezes}
        />
      )}
    </div>
  );
}

function Summary({
  dayNumber,
  results,
  set,
  streak,
  freezes,
}: {
  dayNumber: number;
  results: boolean[];
  set: Scenario[];
  streak: number;
  freezes: number;
}) {
  const hits = results.filter(Boolean).length;
  const [note, setNote] = useState<string | null>(null);
  const grid = results.map((r) => (r ? "🟩" : "🟥")).join("");

  async function share() {
    const text = `Chart Pattern Trainer · Daily #${dayNumber}\n${hits}/${DAILY_SIZE} ${grid}${streak > 1 ? `\n${streak}-day streak` : ""}`;
    const r = await shareText(text, `${window.location.origin}/daily`);
    setNote(r === "copied" ? "Copied. Paste it anywhere." : r === "failed" ? "Couldn't share from this browser." : null);
  }

  const verdict =
    hits === 5 ? "Perfect read." : hits >= 4 ? "Sharp." : hits >= 3 ? "Solid." : hits >= 2 ? "Tough tape today." : "The market won this one.";

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="graph-paper flex flex-col gap-5 rounded-lg border border-border px-5 py-8 md:px-8">
        <div>
          <p className="text-5xl font-bold tabular-nums [font-stretch:88%] md:text-6xl">
            {hits}
            <span className="text-muted">/{DAILY_SIZE}</span>
          </p>
          <p className="mt-1 text-lg font-semibold">{verdict}</p>
        </div>
        <ol className="flex flex-col gap-2">
          {set.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2.5 text-sm">
              <span
                aria-label={results[i] ? "Hit" : "Miss"}
                className={`h-3.5 w-3.5 shrink-0 rounded-[2px] border ${results[i] ? "border-up bg-up" : "border-down"}`}
              />
              <span className="flex-1 font-medium">{s.source?.ticker ?? s.pattern}</span>
              {s.source && (
                <span className={`tabular-nums ${s.source.move >= 0 ? "text-up" : "text-down"}`}>
                  {s.source.move >= 0 ? "+" : ""}
                  {s.source.move.toFixed(1)}%
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <aside className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 md:p-5">
        <div>
          <p className="label">Daily streak</p>
          <p className="text-3xl font-bold tabular-nums [font-stretch:88%]">
            {streak} {streak === 1 ? "day" : "days"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Snowflake size={14} aria-hidden />
            {freezes > 0
              ? `${freezes} streak ${freezes === 1 ? "freeze" : "freezes"} saved. A freeze covers one missed day.`
              : "Play 7 days in a row to earn a streak freeze."}
          </p>
        </div>
        <button
          type="button"
          onClick={share}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg transition-opacity hover:opacity-90"
        >
          <Share2 size={17} aria-hidden />
          Share score
        </button>
        {note && <p className="-mt-2 text-xs text-muted">{note}</p>}
        <Countdown />
        <Link to="/" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
          Keep training while you wait
        </Link>
      </aside>
    </div>
  );
}

function Countdown() {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 0, 0);
      const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      setLeft(`${h}h ${String(m).padStart(2, "0")}m`);
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="text-sm text-muted">
      Next Daily Chart in <span className="font-semibold text-fg tabular-nums">{left}</span>
    </p>
  );
}
