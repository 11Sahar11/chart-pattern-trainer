import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp } from "lucide-react";

const KEY = "cpt-onboarded";

// A small hand-made chart: a climb, a pause, then the call line.
const BARS: [number, number][] = [
  [62, 56], [57, 50], [52, 47], [49, 41], [43, 45], [46, 38], [40, 33], [35, 37],
  [37, 31], [33, 35], [36, 30], [31, 33], [34, 29],
];

function MiniChart({ revealed }: { revealed: boolean }) {
  const after: [number, number][] = [
    [29, 24], [24, 20], [20, 23], [22, 15], [16, 12],
  ];
  const all = revealed ? [...BARS, ...after] : BARS;
  return (
    <svg viewBox="0 0 220 80" className="h-auto w-full" aria-hidden>
      {all.map(([o, c], i) => {
        const x = 8 + i * 11;
        const up = c < o; // smaller y is higher price
        const top = Math.min(o, c);
        const h = Math.max(2, Math.abs(o - c));
        const color = up ? "var(--color-up)" : "var(--color-down)";
        return (
          <g key={i} className={i >= BARS.length ? "onb-plot" : undefined} style={{ animationDelay: `${(i - BARS.length) * 90}ms` }}>
            <line x1={x + 3} x2={x + 3} y1={top - 3} y2={top + h + 3} stroke={color} strokeWidth="1.2" />
            <rect
              x={x}
              y={top}
              width="6"
              height={h}
              fill={up ? "var(--color-surface)" : color}
              stroke={color}
              strokeWidth="1.2"
            />
          </g>
        );
      })}
      <line x1={8 + BARS.length * 11 - 2} x2={8 + BARS.length * 11 - 2} y1="6" y2="76" stroke="var(--color-fg)" strokeWidth="1" strokeDasharray="3 3" />
      <text x={8 + BARS.length * 11 + 2} y="12" fontSize="8" fontWeight="700" fill="var(--color-fg)">
        CALL
      </text>
    </svg>
  );
}

const steps = [
  {
    title: "The chart stops. You call the move.",
    body: "Every round is a real-looking chart cut off right before something happens. Your job is to read it.",
  },
  {
    title: "Higher, lower, or no edge.",
    body: "Plenty of charts go nowhere. Saying “no edge” when there isn't one is a skill, and it scores.",
  },
  {
    title: "Pick the indicators you'd trust.",
    body: "Each chart offers four indicators. Turn on the ones you'd use. After the reveal you'll see which ones helped and which ones misled you.",
  },
];

/** Three quick screens on the very first visit. Skippable, never shown again. */
export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      // storage blocked: skip the intro rather than show it every time
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;
  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onb-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/30 backdrop-blur-[2px] md:items-center"
    >
      <div className="graph-paper flex w-full max-w-md flex-col gap-5 rounded-t-2xl border border-border px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-2xl md:p-7">
        <div className="flex items-center justify-between">
          <ol className="flex gap-1.5" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((_, i) => (
              <li key={i} className={`h-1.5 w-6 rounded-full ${i <= step ? "bg-fg" : "bg-border"}`} />
            ))}
          </ol>
          <button type="button" onClick={close} className="min-h-11 px-2 text-sm font-medium text-muted hover:text-fg">
            Skip
          </button>
        </div>

        <div className="rounded-lg border border-border bg-surface p-3">
          {step === 0 && <MiniChart revealed={false} />}
          {step === 1 && (
            <div className="flex flex-col gap-2">
              <MiniChart revealed />
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                <span className="flex items-center justify-center gap-1 rounded-md border border-up/45 py-2 text-up">
                  <ArrowUp size={14} aria-hidden /> Higher
                </span>
                <span className="flex items-center justify-center gap-1 rounded-md border border-down/45 py-2 text-down">
                  <ArrowDown size={14} aria-hidden /> Lower
                </span>
                <span className="flex items-center justify-center gap-1 rounded-md border border-border py-2 text-muted">
                  <ArrowRight size={14} aria-hidden /> No edge
                </span>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                ["SMA 50", "bg-sma50", "helped", "bg-up"],
                ["RSI 14", "bg-fg", "misled", "bg-down"],
                ["Volume", "bg-pencil", "helped", "bg-up"],
                ["MACD", "bg-sma", "no signal", "bg-border"],
              ].map(([name, sw, verdict, dot]) => (
                <span key={name} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-2">
                  <span className={`h-0.5 w-3 rounded-full ${sw}`} aria-hidden />
                  <span className="flex-1 font-semibold">{name}</span>
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
                  <span className="text-xs text-muted">{verdict}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 id="onb-title" className="text-2xl leading-tight font-bold [font-stretch:88%]">
            {s.title}
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
        </div>

        <button
          type="button"
          onClick={() => (last ? close() : setStep(step + 1))}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-fg px-4 font-semibold text-bg"
        >
          {last ? "Call your first chart" : "Next"}
          <ArrowRight size={17} aria-hidden />
        </button>
      </div>
    </div>
  );
}
