import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import {
  bollinger,
  ema,
  macd,
  obv,
  rsi,
  sma,
  stochastic,
  type Candle,
  type Guide,
  type IndicatorId,
  type Point,
} from "@/lib/market";
import { infoById } from "@/lib/indicators";

type Props = {
  /** Every candle of the setup, including the hidden ones. */
  candles: Candle[];
  /** How many candles are visible. When this grows, the new ones are plotted one by one. */
  visibleCount: number;
  /** Indicators switched on, in display order. */
  active: IndicatorId[];
  guides: Guide[];
  markerTime?: string;
  /** Candles to mark after the reveal, e.g. a hammer at the call. */
  highlight?: { times: string[]; label: string };
  /** Shorter plot on a phone so the call result stays above the Next button. */
  compact?: boolean;
};

const PLOT_MS = 900;
const PANE_IDS: IndicatorId[] = ["rsi", "macd", "stoch", "obv"];

function cssVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function PriceChart({ candles, visibleCount, active, guides, markerTime, highlight, compact }: Props) {
  const priceRef = useRef<HTMLDivElement>(null);
  const paneRefs = useRef<Partial<Record<IndicatorId, HTMLDivElement | null>>>({});
  // The count already on screen, so a reveal animates only the new candles.
  const shownRef = useRef(visibleCount);
  const panes = PANE_IDS.filter((id) => active.includes(id));
  const activeKey = active.join(",");

  useEffect(() => {
    const el = priceRef.current;
    if (!el || candles.length === 0) return;
    const on = (id: IndicatorId) => active.includes(id);

    const ink = cssVar("--color-fg", "#16213a");
    const muted = cssVar("--color-muted", "#4f5b73");
    const pencil = cssVar("--color-pencil", "#5d636c");
    const border = cssVar("--color-border", "#c6d4c4");
    const up = cssVar("--color-up", "#1c7348");
    const down = cssVar("--color-down", "#c0392b");
    const smaColor = cssVar("--color-sma", "#1f4fa3");
    const sma50Color = cssVar("--color-sma50", "#7a3e9d");
    const emaColor = cssVar("--color-ema", "#a65f00");
    const bbColor = cssVar("--color-bb", "#0f766e");
    const primary = cssVar("--color-primary", "#1f4fa3");
    const font = getComputedStyle(document.body).fontFamily;

    const paper = cssVar("--color-surface", "#f8faf6");
    const grid = cssVar("--color-grid", "#d9e5d6");
    const base = {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: paper },
        textColor: muted,
        fontFamily: font,
        fontSize: 11,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      rightPriceScale: { borderColor: border },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: pencil, labelBackgroundColor: ink },
        horzLine: { color: pencil, labelBackgroundColor: ink },
      },
    };
    const lineOpts = (color: string, width: 1 | 2 = 2) => ({
      color,
      lineWidth: width,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const chart = createChart(el, {
      ...base,
      timeScale: { borderColor: border, fixLeftEdge: true },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: true },
    });
    const charts: IChartApi[] = [chart];

    // Chart-book convention: hollow up bars in green ink, filled down bars in red pencil.
    const series = chart.addCandlestickSeries({
      upColor: "rgba(0,0,0,0)",
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
      priceLineVisible: false,
    });
    for (const guide of guides) {
      series.createPriceLine({
        price: guide.price,
        color: pencil,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: guide.title,
      });
    }

    // Each line: its series and its full data, cut to the visible candles while drawing.
    const lines: { s: ISeriesApi<"Line">; rows: Point[] }[] = [];
    const hists: { s: ISeriesApi<"Histogram">; rows: Point[] }[] = [];
    const add = (s: ISeriesApi<"Line">, rows: Point[]) => lines.push({ s, rows });

    if (on("sma")) add(chart.addLineSeries(lineOpts(smaColor)), sma(candles, 20));
    if (on("sma50")) add(chart.addLineSeries(lineOpts(sma50Color)), sma(candles, 50));
    if (on("ema")) add(chart.addLineSeries(lineOpts(emaColor)), ema(candles, 12));
    if (on("bb")) {
      const b = bollinger(candles);
      add(chart.addLineSeries(lineOpts(bbColor, 1)), b.upper);
      add(chart.addLineSeries({ ...lineOpts(bbColor, 1), lineStyle: LineStyle.Dotted }), b.middle);
      add(chart.addLineSeries(lineOpts(bbColor, 1)), b.lower);
    }
    let volume: ISeriesApi<"Histogram"> | null = null;
    if (on("volume")) {
      volume = chart.addHistogramSeries({
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: false,
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    }

    // Oscillators each get a small chart of their own under the price.
    for (const id of panes) {
      const host = paneRefs.current[id];
      if (!host) continue;
      const pane = createChart(host, {
        ...base,
        layout: { ...base.layout, attributionLogo: false },
        timeScale: { borderColor: border, visible: false, fixLeftEdge: true },
        handleScroll: false,
        handleScale: false,
      });
      charts.push(pane);
      if (id === "rsi") {
        const l = pane.addLineSeries({ ...lineOpts(ink), lastValueVisible: true });
        l.createPriceLine({ price: 70, color: down, lineWidth: 1, lineStyle: LineStyle.Dotted, title: "70" });
        l.createPriceLine({ price: 30, color: up, lineWidth: 1, lineStyle: LineStyle.Dotted, title: "30" });
        add(l, rsi(candles, 14));
      } else if (id === "stoch") {
        const st = stochastic(candles);
        const k = pane.addLineSeries({ ...lineOpts(emaColor), lastValueVisible: true });
        k.createPriceLine({ price: 80, color: down, lineWidth: 1, lineStyle: LineStyle.Dotted, title: "80" });
        k.createPriceLine({ price: 20, color: up, lineWidth: 1, lineStyle: LineStyle.Dotted, title: "20" });
        add(k, st.k);
        add(pane.addLineSeries({ ...lineOpts(pencil, 1), lineStyle: LineStyle.Dashed }), st.d);
      } else if (id === "macd") {
        const m = macd(candles);
        hists.push({ s: pane.addHistogramSeries({ priceLineVisible: false, lastValueVisible: false }), rows: m.hist });
        add(pane.addLineSeries(lineOpts(smaColor)), m.line);
        add(pane.addLineSeries(lineOpts(emaColor, 1)), m.signal);
      } else if (id === "obv") {
        add(
          pane.addLineSeries({ ...lineOpts(primary), priceFormat: { type: "volume" }, lastValueVisible: true }),
          obv(candles),
        );
      }
    }

    function draw(count: number) {
      const shown = candles.slice(0, count);
      const lastTime = shown[shown.length - 1]?.time ?? "";
      series.setData(shown.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
      // Lines never peek past the last plotted candle.
      for (const { s, rows } of lines) s.setData(rows.filter((r) => r.time <= lastTime));
      for (const { s, rows } of hists) {
        s.setData(
          rows
            .filter((r) => r.time <= lastTime)
            .map((r) => ({ ...r, color: `${r.value >= 0 ? up : down}80` })),
        );
      }
      volume?.setData(
        shown.map((c) => ({ time: c.time, value: c.volume, color: `${c.close >= c.open ? up : down}59` })),
      );
      if (markerTime && count > 0) {
        const marks: SeriesMarker<Time>[] = (highlight?.times ?? [])
          .filter((t) => t !== markerTime)
          .map((t) => ({ time: t, position: "belowBar" as const, color: primary, shape: "circle" as const, text: "" }));
        marks.push({
          time: markerTime,
          position: "aboveBar",
          color: ink,
          shape: "arrowDown",
          text: "",
        });
        if (highlight?.times.includes(markerTime)) {
          marks.push({ time: markerTime, position: "belowBar", color: primary, shape: "circle", text: "" });
        }
        marks.sort((a, b) => (String(a.time) < String(b.time) ? -1 : String(a.time) > String(b.time) ? 1 : 0));
        series.setMarkers(marks);
      }
    }

    // Keep the whole setup's width on the time axis from the start, so the
    // reveal plots into empty paper instead of rescaling the chart.
    const total = candles.length;
    const frame = () => {
      for (const c of charts) c.timeScale().setVisibleLogicalRange({ from: -0.5, to: total - 0.5 });
    };

    const from = Math.min(shownRef.current, visibleCount);
    let raf = 0;
    if (from < visibleCount && !prefersReducedMotion()) {
      draw(from);
      frame();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / PLOT_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        draw(from + Math.round((visibleCount - from) * eased));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    } else {
      draw(visibleCount);
      frame();
    }
    shownRef.current = visibleCount;

    return () => {
      cancelAnimationFrame(raf);
      for (const c of charts) c.remove();
    };
    // `activeKey` stands in for `active`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, visibleCount, activeKey, markerTime, guides, highlight?.label]);

  const callLabel = highlight ? `Call · ${highlight.label}` : "Call";

  return (
    <div className="price-chart flex flex-col bg-surface">
      <div className="relative">
        <div
          ref={priceRef}
          className={`w-full md:h-[440px] ${compact ? "h-[200px]" : "h-[min(42svh,320px)]"}`}
          role="img"
          aria-label={`Candlestick chart, ${visibleCount} of ${candles.length} days shown`}
        />
        {markerTime && (
          <p className="pointer-events-none absolute top-1.5 left-12 z-10 max-w-[58%] truncate rounded bg-surface/95 px-1.5 py-0.5 text-[11px] font-semibold leading-none">
            {callLabel}
          </p>
        )}
      </div>
      {panes.map((id) => (
        <div key={id} className="border-t border-border">
          <p className="label px-3 pt-1.5">{infoById.get(id)?.short}</p>
          <div
            ref={(node) => {
              paneRefs.current[id] = node;
            }}
            className="h-20 w-full md:h-24"
          />
        </div>
      ))}
    </div>
  );
}
