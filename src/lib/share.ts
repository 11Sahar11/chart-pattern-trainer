import type { Direction, Scenario } from "@/lib/market";

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

// The card is always drawn in the light chart-paper look, whatever the theme.
const C = {
  paper: "#f8faf6",
  grid: "#d9e5d6",
  major: "#b9cfb8",
  ink: "#16213a",
  muted: "#4f5b73",
  up: "#1c7348",
  down: "#c0392b",
};

const word = (d: Direction) => (d === "up" ? "higher" : d === "down" ? "lower" : "no edge");

/** Share text plus a link, through the system share sheet or the clipboard. */
export async function shareText(text: string, url: string, files?: File[]): Promise<ShareResult> {
  const data: ShareData = { text, url };
  try {
    if (files?.length && navigator.canShare?.({ ...data, files })) {
      await navigator.share({ ...data, files });
      return "shared";
    }
    if (navigator.share) {
      await navigator.share(data);
      return "shared";
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

export async function shareReveal(s: Scenario, pick: Direction, hit: boolean): Promise<ShareResult> {
  const name = s.source?.title ?? s.source?.ticker ?? s.pattern;
  const text = hit
    ? `I called ${name} ${word(pick)} before the move, and it went ${word(s.correct)}. Can you read it?`
    : `${name} fooled me: I said ${word(pick)}, it went ${word(s.correct)}. Can you do better?`;
  let files: File[] | undefined;
  try {
    const blob = await drawCard(s, pick, hit);
    if (blob) files = [new File([blob], "chart-call.png", { type: "image/png" })];
  } catch {
    // share without the picture
  }
  return shareText(text, window.location.origin, files);
}

async function drawCard(s: Scenario, pick: Direction, hit: boolean): Promise<Blob | null> {
  const W = 1080;
  const H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  try {
    await document.fonts?.ready;
  } catch {
    // system font
  }
  const font = (weight: number, size: number) => `${weight} ${size}px Archivo, "Helvetica Neue", Arial, sans-serif`;

  // Paper and printed grid.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  for (let x = 0; x <= W; x += 12) {
    ctx.fillStyle = x % 60 === 0 ? C.major : C.grid;
    ctx.fillRect(x, 0, 1, H);
  }
  for (let y = 0; y <= H; y += 12) {
    ctx.fillStyle = y % 60 === 0 ? C.major : C.grid;
    ctx.fillRect(0, y, W, 1);
  }

  // Heading band.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, 300);
  ctx.fillStyle = hit ? C.up : C.down;
  ctx.font = font(700, 44);
  ctx.fillText(hit ? "HIT" : "MISS", 72, 110);
  ctx.fillStyle = C.ink;
  ctx.font = font(700, 64);
  ctx.fillText(`Called ${word(pick)}.`, 72, 190);
  ctx.fillStyle = C.muted;
  ctx.font = font(500, 34);
  const name = s.source?.title ?? s.source?.ticker ?? s.pattern;
  const move = s.source ? ` · ${s.source.move >= 0 ? "+" : ""}${s.source.move.toFixed(1)}% in 20 days` : "";
  ctx.fillText(`${name} went ${word(s.correct)}${move}`.slice(0, 60), 72, 250);

  // Candles, with the call line.
  const top = 340;
  const bottom = 900;
  const left = 72;
  const right = W - 72;
  const candles = s.candles;
  const hi = Math.max(...candles.map((c) => c.high));
  const lo = Math.min(...candles.map((c) => c.low));
  const y = (p: number) => bottom - ((p - lo) / (hi - lo || 1)) * (bottom - top);
  const step = (right - left) / candles.length;
  const body = Math.max(3, step * 0.6);
  candles.forEach((c, i) => {
    const x = left + i * step + step / 2;
    const up = c.close >= c.open;
    const col = up ? C.up : C.down;
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y(c.high));
    ctx.lineTo(x, y(c.low));
    ctx.stroke();
    const yt = y(Math.max(c.open, c.close));
    const h = Math.max(2, Math.abs(y(c.open) - y(c.close)));
    if (up) {
      ctx.fillStyle = C.paper;
      ctx.fillRect(x - body / 2, yt, body, h);
      ctx.strokeRect(x - body / 2, yt, body, h);
    } else {
      ctx.fillStyle = col;
      ctx.fillRect(x - body / 2, yt, body, h);
    }
  });
  const callX = left + s.revealAt * step;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(callX, top - 20);
  ctx.lineTo(callX, bottom + 10);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.ink;
  ctx.font = font(700, 26);
  ctx.fillText("CALL", callX + 10, top);

  // Footer.
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 960, W, 120);
  ctx.fillStyle = C.ink;
  ctx.font = font(700, 36);
  ctx.fillText("Chart Pattern Trainer", 72, 1020);
  ctx.fillStyle = C.muted;
  ctx.font = font(500, 28);
  ctx.fillText(`Can you call the next move?  ${window.location.host}`, 72, 1058);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}
