import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
} from "lightweight-charts";
import { ema, rsi, sma, type Candle, type Guide } from "@/lib/market";

type Props = {
  /** Every candle of the setup, including the hidden ones. */
  candles: Candle[];
  /** How many candles are visible. When this grows, the new ones are plotted one by one. */
  visibleCount: number;
  showSma: boolean;
  showEma: boolean;
  showVolume: boolean;
  showRsi: boolean;
  guides: Guide[];
  markerTime?: string;
};

const PLOT_MS = 900;

function cssVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function PriceChart({
  candles,
  visibleCount,
  showSma,
  showEma,
  showVolume,
  showRsi,
  guides,
  markerTime,
}: Props) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  // The count already on screen, so a reveal animates only the new candles.
  const shownRef = useRef(visibleCount);

  useEffect(() => {
    const el = priceRef.current;
    if (!el || candles.length === 0) return;

    const ink = cssVar("--color-fg", "#16213a");
    const muted = cssVar("--color-muted", "#4f5b73");
    const pencil = cssVar("--color-pencil", "#5d636c");
    const border = cssVar("--color-border", "#c6d4c4");
    const up = cssVar("--color-up", "#1c7348");
    const down = cssVar("--color-down", "#c0392b");
    const smaColor = cssVar("--color-sma", "#1f4fa3");
    const emaColor = cssVar("--color-ema", "#a65f00");
    const font = getComputedStyle(document.body).fontFamily;

    const base = {
      autoSize: true,
      layout: {
        // Transparent so the page's printed grid shows through.
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: muted,
        fontFamily: font,
        fontSize: 11,
      },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderColor: border },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: pencil, labelBackgroundColor: ink },
        horzLine: { color: pencil, labelBackgroundColor: ink },
      },
    };

    const chart = createChart(el, {
      ...base,
      timeScale: { borderColor: border, fixLeftEdge: true },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: true },
    });

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

    const smaLine = showSma
      ? chart.addLineSeries({ color: smaColor, lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
      : null;
    const emaLine = showEma
      ? chart.addLineSeries({ color: emaColor, lineWidth: 2, priceLineVisible: false, lastValueVisible: false })
      : null;
    const volume = showVolume
      ? chart.addHistogramSeries({
          priceScaleId: "vol",
          priceFormat: { type: "volume" },
          priceLineVisible: false,
          lastValueVisible: false,
        })
      : null;
    if (volume) {
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    }

    let rsiChart: IChartApi | null = null;
    let rsiLine: ISeriesApi<"Line"> | null = null;
    if (showRsi && rsiRef.current) {
      rsiChart = createChart(rsiRef.current, {
        ...base,
        timeScale: { borderColor: border, visible: false, fixLeftEdge: true },
        handleScroll: false,
        handleScale: false,
      });
      rsiLine = rsiChart.addLineSeries({ color: ink, lineWidth: 2, priceLineVisible: false });
      rsiLine.createPriceLine({ price: 70, color: down, lineWidth: 1, lineStyle: LineStyle.Dotted, title: "70" });
      rsiLine.createPriceLine({ price: 30, color: up, lineWidth: 1, lineStyle: LineStyle.Dotted, title: "30" });
    }

    // Indicators are computed on the whole setup, then cut to what is visible,
    // so a line never peeks past the last plotted candle.
    const smaAll = sma(candles, 20);
    const emaAll = ema(candles, 12);
    const rsiAll = rsi(candles, 14);
    const upTo = (rows: LineData<Time>[], lastTime: string) =>
      rows.filter((r) => (r.time as string) <= lastTime);

    function draw(count: number) {
      const shown = candles.slice(0, count);
      const lastTime = shown[shown.length - 1]?.time ?? "";
      series.setData(shown.map(({ time, open, high, low, close }) => ({ time, open, high, low, close })));
      smaLine?.setData(upTo(smaAll, lastTime));
      emaLine?.setData(upTo(emaAll, lastTime));
      rsiLine?.setData(upTo(rsiAll, lastTime));
      volume?.setData(
        shown.map((c) => ({
          time: c.time,
          value: c.volume,
          color: `${c.close >= c.open ? up : down}59`,
        })),
      );
      if (markerTime && count > 0) {
        series.setMarkers([
          { time: markerTime, position: "aboveBar", color: ink, shape: "arrowDown", text: "Call" },
        ]);
      }
    }

    // Keep the whole setup's width on the time axis from the start, so the
    // reveal plots into empty paper instead of rescaling the chart.
    const total = candles.length;
    const frame = () => {
      chart.timeScale().setVisibleLogicalRange({ from: -0.5, to: total - 0.5 });
      rsiChart?.timeScale().setVisibleLogicalRange({ from: -0.5, to: total - 0.5 });
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
      chart.remove();
      rsiChart?.remove();
    };
  }, [candles, visibleCount, showSma, showEma, showVolume, showRsi, markerTime, guides]);

  return (
    <div className="graph-paper flex flex-col">
      <div
        ref={priceRef}
        className="h-[min(56svh,340px)] w-full md:h-[460px]"
        role="img"
        aria-label={`Candlestick chart, ${visibleCount} of ${candles.length} days shown`}
      />
      {showRsi ? (
        <div className="border-t border-border">
          <p className="label px-3 pt-2">RSI 14</p>
          <div ref={rsiRef} className="h-24 w-full md:h-28" />
        </div>
      ) : null}
    </div>
  );
}
