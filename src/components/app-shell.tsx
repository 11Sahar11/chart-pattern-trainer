import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarCheck, ChartCandlestick, ChartColumn, History } from "lucide-react";

const nav = [
  { to: "/", label: "Train", icon: ChartCandlestick },
  { to: "/daily", label: "Daily", icon: CalendarCheck },
  { to: "/moments", label: "Moments", icon: History },
  { to: "/patterns", label: "Patterns", icon: BookOpen },
  { to: "/stats", label: "Stats", icon: ChartColumn },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm md:sticky md:top-0 md:z-20">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-6 px-4 md:h-16 md:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" width={28} height={28} className="rounded-md" />
            <span className="text-lg font-bold tracking-tight [font-stretch:88%] md:text-xl">Chart Pattern Trainer</span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {nav.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-fg data-[status=active]:bg-raised data-[status=active]:text-fg"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-10">{children}</main>

      <footer className="mx-auto mb-24 flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 pb-6 text-xs text-muted md:mb-0 md:px-8">
        <p className="max-w-[70ch]">
          A drill, not a broker. Real charts use Yahoo Finance daily data rebased to 100. A correct call here is no
          reason to trade real money.
        </p>
        <span className="flex gap-4">
          <Link to="/patterns" className="inline-flex min-h-11 items-center underline-offset-2 hover:text-fg hover:underline md:min-h-0">
            Chart patterns
          </Link>
          <Link to="/privacy" className="inline-flex min-h-11 items-center underline-offset-2 hover:text-fg hover:underline md:min-h-0">
            Privacy
          </Link>
        </span>
      </footer>

      {/* Phone tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted [font-stretch:90%] data-[status=active]:text-fg"
              >
                {({ isActive }: { isActive: boolean }) => (
                  <>
                    <span
                      className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${isActive ? "bg-raised" : ""}`}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
