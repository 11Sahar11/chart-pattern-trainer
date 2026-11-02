#!/usr/bin/env node
// Renders the app icons (web + Android) and the Google Play feature graphic
// from SVG with sharp:  npm i sharp --no-save && node scripts/build-store-assets.mjs
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PAPER = "#f8faf6";
const GRID = "#d9e5d6";
const MAJOR = "#b9cfb8";
const INK = "#16213a";
const UP = "#1c7348";
const DOWN = "#c0392b";

function grid(w, h, minor, major) {
  let s = "";
  for (let x = 0; x <= w; x += minor) s += `<path d="M${x} 0V${h}" stroke="${x % major ? GRID : MAJOR}" stroke-width="${x % major ? 1 : 1.5}"/>`;
  for (let y = 0; y <= h; y += minor) s += `<path d="M0 ${y}H${w}" stroke="${y % major ? GRID : MAJOR}" stroke-width="${y % major ? 1 : 1.5}"/>`;
  return s;
}

// The mark: an ink price line that stops at the call, then a dashed green move.
// `inset` keeps it inside the maskable safe zone (centre 80%).
function icon(size, inset) {
  const k = (size * (1 - inset * 2)) / 512;
  const o = size * inset;
  const p = (x, y) => `${(o + x * k).toFixed(1)} ${(o + y * k).toFixed(1)}`;
  const sw = 34 * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${PAPER}"/>
    ${grid(size, size, size / 16, size / 4)}
    <path d="M${p(64, 372)} L${p(170, 236)} L${p(240, 300)} L${p(320, 168)}" fill="none" stroke="${INK}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${p(320, 168)} L${p(448, 96)}" fill="none" stroke="${UP}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${sw * 0.9} ${sw * 0.9}"/>
    <circle cx="${o + 320 * k}" cy="${o + 168 * k}" r="${sw * 0.95}" fill="${PAPER}" stroke="${INK}" stroke-width="${sw * 0.45}"/>
  </svg>`;
}

function featureGraphic() {
  const W = 1024, H = 500;
  // Deterministic candles that climb into a breakout on the right half.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let price = 300;
  let bars = "";
  for (let i = 0; i < 34; i++) {
    const x = 520 + i * 14;
    const drift = i < 22 ? (i % 7 < 4 ? 3 : -4) : -9;
    const open = price;
    const close = price + drift + (rnd() - 0.5) * 14;
    const hi = Math.min(open, close) - 4 - rnd() * 8;
    const lo = Math.max(open, close) + 4 + rnd() * 8;
    const up = close < open; // y grows downward
    const c = i >= 22 ? (up ? UP : DOWN) : up ? UP : DOWN;
    const top = Math.min(open, close);
    const h = Math.max(2, Math.abs(close - open));
    bars += `<path d="M${x + 4} ${hi}V${lo}" stroke="${c}" stroke-width="2"/>`;
    bars += up
      ? `<rect x="${x}" y="${top}" width="8" height="${h}" fill="${PAPER}" stroke="${c}" stroke-width="2"/>`
      : `<rect x="${x}" y="${top}" width="8" height="${h}" fill="${c}"/>`;
    price = close;
  }
  const callX = 520 + 21 * 14 + 11;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    ${grid(W, H, 10, 50)}
    <rect x="0" y="0" width="505" height="${H}" fill="${PAPER}" opacity="0.92"/>
    <path d="M${callX} 60V440" stroke="${INK}" stroke-width="2" stroke-dasharray="6 6"/>
    <text x="${callX + 8}" y="80" font-family="DejaVu Sans Condensed" font-weight="bold" font-size="18" fill="${INK}">CALL</text>
    ${bars}
    <text x="56" y="210" font-family="DejaVu Sans Condensed" font-weight="bold" font-size="58" fill="${INK}">Chart Pattern</text>
    <text x="56" y="276" font-family="DejaVu Sans Condensed" font-weight="bold" font-size="58" fill="${INK}">Trainer</text>
    <text x="58" y="330" font-family="DejaVu Sans" font-size="24" fill="#4f5b73">Read the chart. Call the next move.</text>
  </svg>`;
}

const out = [
  ["public/icons/icon-192.png", icon(192, 0.06)],
  ["public/icons/icon-512.png", icon(512, 0.06)],
  ["public/icons/maskable-512.png", icon(512, 0.16)],
  ["public/icons/apple-touch-icon.png", icon(180, 0.08)],
  ["store/play-icon-512.png", icon(512, 0.06)],
  ["store/feature-graphic-1024x500.png", featureGraphic()],
];

for (const [rel, svg] of out) {
  const file = resolve(root, rel);
  await mkdir(dirname(file), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log("✓", rel);
}

// Share card for links (1200×630): the feature graphic on a paper margin.
await sharp(Buffer.from(featureGraphic()))
  .resize(1200, 586)
  .extend({ top: 22, bottom: 22, background: PAPER })
  .png()
  .toFile(resolve(root, "public/og.png"));
console.log("✓ public/og.png");
