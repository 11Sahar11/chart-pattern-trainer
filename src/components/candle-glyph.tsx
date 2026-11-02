import type { Candle } from "@/lib/market";

/**
 * A small static candlestick drawing on chart paper. The last `highlight`
 * candles are the pattern; the lead-in is drawn fainter.
 */
export function CandleGlyph({
  candles,
  highlight,
  className = "",
  label,
}: {
  candles: Candle[];
  highlight: number;
  className?: string;
  label: string;
}) {
  const hi = Math.max(...candles.map((c) => c.high));
  const lo = Math.min(...candles.map((c) => c.low));
  const W = 200;
  const H = 120;
  const pad = 10;
  const y = (p: number) => pad + ((hi - p) / (hi - lo || 1)) * (H - pad * 2);
  const step = (W - pad * 2) / candles.length;
  const bw = Math.max(4, step * 0.56);
  const firstHi = candles.length - highlight;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className={`h-auto w-full ${className}`}>
      {highlight > 0 && (
        <rect
          x={pad + firstHi * step - 2}
          y={2}
          width={highlight * step + 4}
          height={H - 4}
          rx={4}
          fill="var(--color-raised)"
        />
      )}
      {candles.map((c, i) => {
        const x = pad + i * step + step / 2;
        const up = c.close >= c.open;
        const color = up ? "var(--color-up)" : "var(--color-down)";
        const top = y(Math.max(c.open, c.close));
        const h = Math.max(1.5, Math.abs(y(c.open) - y(c.close)));
        const faded = i < firstHi;
        return (
          <g key={i} opacity={faded ? 0.35 : 1}>
            <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={faded ? 1 : 1.6} />
            <rect
              x={x - bw / 2}
              y={top}
              width={bw}
              height={h}
              fill={up ? "var(--color-surface)" : color}
              stroke={color}
              strokeWidth={faded ? 1 : 1.6}
            />
          </g>
        );
      })}
    </svg>
  );
}
