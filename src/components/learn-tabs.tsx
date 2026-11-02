import { Link } from "@tanstack/react-router";

/** Switch between the two halves of Learn. */
export function LearnTabs({ current }: { current: "patterns" | "indicators" | "candles" }) {
  const tab = (active: boolean) =>
    `inline-flex h-11 items-center rounded-[5px] px-3 text-sm sm:px-4 font-semibold md:h-9 ${
      active ? "bg-fg text-bg" : "text-muted hover:text-fg"
    }`;
  return (
    <nav aria-label="Learn" className="inline-flex self-start rounded-md border border-border bg-surface p-0.5">
      <Link to="/patterns" className={tab(current === "patterns")} aria-current={current === "patterns" ? "page" : undefined}>
        Patterns
      </Link>
      <Link to="/indicators" className={tab(current === "indicators")} aria-current={current === "indicators" ? "page" : undefined}>
        Indicators
      </Link>
      <Link to="/candles" className={tab(current === "candles")} aria-current={current === "candles" ? "page" : undefined}>
        Candles
      </Link>
    </nav>
  );
}
