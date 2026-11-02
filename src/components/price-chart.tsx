import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
} from "lightweight-charts";
import { ema, rsi, sma, type Candle, type Guide } from "@/lib/market";

type Props = {
  candles: Candle[];
  showSma: boolean;
  showEma: boolean;
  showVolume: boolean;
  showRsi: boolean;
  guides: Guide[];
  markerTime?: string;
};

function cssVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function PriceChart({
  candles,
  showSma,
  showEma,
  showVolume,
  showRsi,
  guides,
  markerTime,
}: Props) {
  const priceRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = priceRef.current;
    if (!el || candles.length === 0) return;

    const bg = cssVar("--color-surface", "#141a18");
    const fg = cssVar("--color-muted", "#9aa39c");
    const grid = cssVar("--color-border", "#2c3833");
    const up = cssVar("--color-up", "#3ea878");
    const down = cssVar("--color-down", "#d15b4a");
    const gold = cssVar("--color-primary", "#d4b36a");

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor: fg,
        fontFamily: "Outfit, sans-serif",
      },
      grid: {
        vertLines: { color: grid },
        horzLines: { color: grid },
      },
      rightPriceScale: { borderColor: grid },
      timeScale: { borderColor: grid, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: true },
    });

    const series = chart.addCandlestickSeries({
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
    series.setData(
      candles.map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    if (markerTime) {
      series.setMarkers([
        {
          time: markerTime,
          position: "aboveBar",
          color: gold,
          shape: "circle",
          text: "Call",
        },
      ]);
    }

    for (const guide of guides) {
      series.createPriceLine({
        price: guide.price,
        color: gold,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: guide.title,
      });
    }

    if (showSma) {
      const line = chart.addLineSeries({ color: gold, lineWidth: 2, priceLineVisible: false });
      line.setData(sma(candles, 20));
    }
    if (showEma) {
      const line = chart.addLineSeries({
        color: up,
        lineWidth: 2,
        priceLineVisible: false,
      });
      line.setData(ema(candles, 12));
    }
    if (showVolume) {
      const hist = chart.addHistogramSeries({
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
        priceLineVisible: false,
      });
      hist.setData(
        candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? `${up}73` : `${down}73`,
        })),
      );
      chart.priceScale("vol").applyOptions({
        scaleMargins: { top: 0.78, bottom: 0 },
      });
    }

    chart.timeScale().fitContent();

    let rsiChart: IChartApi | null = null;
    if (showRsi && rsiRef.current) {
      rsiChart = createChart(rsiRef.current, {
        autoSize: true,
        layout: {
          background: { type: ColorType.Solid, color: bg },
          textColor: fg,
          fontFamily: "Outfit, sans-serif",
        },
        grid: {
          vertLines: { color: grid },
          horzLines: { color: grid },
        },
        rightPriceScale: { borderColor: grid },
        timeScale: { borderColor: grid, visible: false },
        crosshair: { mode: CrosshairMode.Normal },
        handleScroll: false,
        handleScale: false,
      });
      const rsiLine = rsiChart.addLineSeries({
        color: gold,
        lineWidth: 2,
        priceLineVisible: false,
      });
      rsiLine.setData(rsi(candles, 14));
      rsiLine.createPriceLine({
        price: 70,
        color: down,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: "70",
      });
      rsiLine.createPriceLine({
        price: 30,
        color: up,
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        title: "30",
      });
      rsiChart.timeScale().fitContent();
    }

    return () => {
      chart.remove();
      rsiChart?.remove();
    };
  }, [candles, showSma, showEma, showVolume, showRsi, markerTime, guides]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={priceRef} className="h-72 w-full md:h-[440px]" />
      {showRsi ? (
        <div>
          <p className="px-3 pb-1 text-xs tracking-wide text-muted uppercase">RSI 14</p>
          <div ref={rsiRef} className="h-28 w-full" />
        </div>
      ) : null}
    </div>
  );
}
