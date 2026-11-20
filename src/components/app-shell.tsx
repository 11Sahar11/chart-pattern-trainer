import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarCheck,
  ChartCandlestick,
  ChartColumn,
  Flame,
  History,
} from "lucide-react";
import { moments } from "@/lib/real-scenarios";
import { DAILY_SIZE, dateKey, liveStreak, useProgress } from "@/lib/progress";

const nav = [
  { to: "/", label: "Train", icon: ChartCandlestick },
  { to: "/daily", label: "Daily", icon: CalendarCheck },
  { to: "/moments", label: "Moments", icon: History },
  { to: "/patterns", label: "Learn", icon: BookOpen },
  { to: "/stats", label: "Stats", icon: ChartColumn },
] as const;

/** Header shortcut to today's Daily: a dot until it's played, then the streak. */
function DailyPill() {
  const progress = useProgress();
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(dateKey()), []);
  if (!today) return null;
  const done = (progress.daily[today]?.length ?? 0) >= DAILY_SIZE;
  const streak = liveStreak(progress, today);
  return (
    <Link
      to="/daily"
      className="relative inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-semibold"
    >
      {done ? (
        <>
          <Flame size={15} className="text-ema" aria-hidden />
          <span className="tabular-nums">{streak}</span>
          <span className="sr-only">day streak. Today's Daily is done.</span>
        </>
      ) : (
        <>
          <CalendarCheck size={15} className="text-primary" aria-hidden />
          Daily
          <span
            className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-down ring-2 ring-bg"
            aria-hidden
          />
          <span className="sr-only">Today's Daily Chart is ready.</span>
        </>
      )}
    </Link>
  );
}

/** Learn covers both patterns and indicators. */
function isActive(to: string, path: string) {
  if (to === "/") return path === "/";
  if (to === "/patterns")
    return ["/patterns", "/indicators", "/candles"].some((p) => path.startsWith(p));
  return path.startsWith(to);
}

/** The long disclaimer sits under a post-call result, so drill screens keep it off this scroll. */
function showsDisclaimer(path: string) {
  if (path === "/" || path === "/daily") return false;
  if (/^\/moments\/[^/]+$/.test(path)) return false;
  if (/^\/patterns\/[^/]+$/.test(path)) return false;
  if (/^\/indicators\/[^/]+$/.test(path)) return false;
  return true;
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = nav.filter((item) => item.to !== "/moments" || moments.length > 0);
  const disclaimer = showsDisclaimer(path);
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:sticky md:top-0 md:z-20">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-4 md:h-16 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" width={28} height={28} className="rounded-md" />
            <span className="text-base font-bold tracking-tight [font-stretch:88%] sm:text-lg md:text-xl">
              Chart Pattern Trainer
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
              {items.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  aria-current={isActive(to, path) ? "page" : undefined}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:text-fg ${
                    isActive(to, path) ? "bg-raised text-fg" : "text-muted"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <DailyPill />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-3 pb-28 md:px-8 md:pt-6 md:pb-10">
        {children}
      </main>

      <footer className="mx-auto mb-24 flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 pb-6 text-xs text-muted md:mb-0 md:px-8">
        {disclaimer && (
          <p className="max-w-[70ch]">
            This trains pattern reading, not live trading. Real charts use historical daily prices
            rebased to 100. A correct call here is no reason to trade real money.
          </p>
        )}
        <span className="flex gap-4">
          <Link
            to="/patterns"
            className="inline-flex min-h-11 items-center underline-offset-2 hover:text-fg hover:underline md:min-h-0"
          >
            Chart patterns
          </Link>
          <Link
            to="/privacy"
            className="inline-flex min-h-11 items-center underline-offset-2 hover:text-fg hover:underline md:min-h-0"
          >
            Privacy
          </Link>
        </span>
      </footer>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <ul
          className={`mx-auto grid max-w-md ${items.length >= 5 ? "grid-cols-5" : "grid-cols-4"}`}
        >
          {items.map(({ to, label, icon: Icon }) => {
            const active = isActive(to, path);
            return (
              <li key={to}>
                <Link
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold [font-stretch:90%] ${
                    active ? "text-fg" : "text-muted"
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-raised" : ""}`}
                  >
                    <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
