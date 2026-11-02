#!/usr/bin/env node
// Writes public/robots.txt and public/sitemap.xml before each build.
// The sitemap needs absolute URLs, so it is only written when VITE_SITE_URL is set
// (e.g. https://charttrainer.app in the Vercel project settings).
import { readFile, writeFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = (process.env.VITE_SITE_URL ?? "").replace(/\/$/, "");

const patternsSrc = await readFile(resolve(root, "src/lib/patterns.ts"), "utf8");
const slugs = [...patternsSrc.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const indicators = ["sma", "sma50", "ema", "bb", "volume", "obv", "rsi", "macd", "stoch"];
const candleSrc = await readFile(resolve(root, "src/lib/candles.ts"), "utf8");
const candles = [...candleSrc.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]);
const pages = [
  "/",
  "/daily",
  "/moments",
  "/patterns",
  ...slugs.map((s) => `/patterns/${s}`),
  "/indicators",
  ...indicators.map((i) => `/indicators/${i}`),
  "/candles",
  "/candles/quiz",
  ...candles.map((c) => `/candles/${c}`),
  "/privacy",
];

const robots = ["User-agent: *", "Allow: /", ...(site ? ["", `Sitemap: ${site}/sitemap.xml`] : [])].join("\n");
await writeFile(resolve(root, "public/robots.txt"), `${robots}\n`);

const sitemapPath = resolve(root, "public/sitemap.xml");
if (!site) {
  await rm(sitemapPath, { force: true });
  console.log("robots.txt written; set VITE_SITE_URL to also write sitemap.xml");
} else {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    .map((p) => `  <url><loc>${site}${p === "/" ? "" : p}</loc><lastmod>${today}</lastmod></url>`)
    .join("\n");
  await writeFile(
    sitemapPath,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
  );
  console.log(`robots.txt and sitemap.xml written (${pages.length} pages)`);
}
