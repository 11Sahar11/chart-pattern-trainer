// CI only: opens the running dev server and photographs every page on a phone
// and a desktop, playing a few rounds so revealed and filled-in states show.
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.env.OUT_DIR ?? "shots";
await mkdir(OUT, { recursive: true });

const errors = [];
const browser = await chromium.launch();

async function session(name, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1.5, ...opts });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`[${name}] pageerror ${page.url()}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${name}] console ${page.url()}: ${m.text()}`);
  });
  return { ctx, page };
}

async function shot(page, file, full = true) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: full });
  console.log("shot", file);
}

async function go(page, path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
}

async function call(page, label = "Higher") {
  // Turn on the first offered indicator, then make the call.
  const chip = page.locator('fieldset button[aria-pressed="false"]').first();
  if (await chip.count()) await chip.click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: new RegExp(`^${label}`) }).first().click();
  await page.waitForTimeout(1800); // reveal plot + pencil ring
}

for (const [name, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["desktop", { width: 1280, height: 900 }],
]) {
  const { ctx, page } = await session(name, viewport);
  await go(page, "/");
  for (let i = 1; i <= 3; i++) {
    await shot(page, `${name}-00-welcome-${i}`, false);
    await page.getByRole("button", { name: /^(Next|Call your first chart)/ }).click();
    await page.waitForTimeout(500);
  }
  // What a phone shows without scrolling: chart and calls should both fit.
  await shot(page, `${name}-01-home-first-screen`, false);
  await shot(page, `${name}-01b-home-full`);
  await call(page, "Higher");
  await shot(page, `${name}-02-home-revealed`);
  await page.getByText("Why it moved", { exact: true }).click();
  await shot(page, `${name}-02b-revealed-why`);

  await go(page, "/daily");
  await shot(page, `${name}-03-daily`);
  for (let i = 0; i < 5; i++) {
    await call(page, i % 2 ? "Lower" : "Higher");
    const next = page.getByRole("button", { name: /Next chart|See today's score/ });
    await next.click();
    await page.waitForTimeout(500);
  }
  await shot(page, `${name}-04-daily-summary`);

  await go(page, "/moments");
  await shot(page, `${name}-05-moments`);
  await go(page, "/moments/crashes");
  await call(page, "Lower");
  await shot(page, `${name}-06-moment-revealed`);

  await go(page, "/patterns");
  await shot(page, `${name}-07-patterns`);
  await go(page, "/patterns/bull-flag");
  await shot(page, `${name}-08-pattern-page`);

  await go(page, "/indicators");
  await shot(page, `${name}-08b-indicators`);
  await go(page, "/indicators/macd");
  await call(page, "Lower");
  await shot(page, `${name}-08c-indicator-page`);

  await go(page, "/candles");
  await shot(page, `${name}-11-candles`);
  await go(page, "/candles/morning-star");
  await shot(page, `${name}-12-candle-page`);
  await go(page, "/candles/quiz");
  await shot(page, `${name}-13-quiz`, false);
  await page.getByRole("group", { name: "Answers" }).getByRole("button").first().click();
  await page.waitForTimeout(300);
  await shot(page, `${name}-14-quiz-answered`, false);
  for (let i = 0; i < 10; i++) {
    const answer = page.getByRole("group", { name: "Answers" }).getByRole("button").first();
    if (await answer.isEnabled().catch(() => false)) await answer.click();
    await page.getByRole("button", { name: /Next candle|See your score/ }).click();
    await page.waitForTimeout(250);
  }
  await shot(page, `${name}-15-quiz-score`);

  await go(page, "/");
  await page.selectOption("#deck", "review");
  await page.waitForTimeout(800);
  await shot(page, `${name}-09-review`);

  await go(page, "/stats");
  await shot(page, `${name}-10-stats`);
  await ctx.close();
}

// Dark theme, phone.
{
  const { ctx, page } = await session("dark", { width: 390, height: 844 }, { colorScheme: "dark" });
  await go(page, "/");
  await page.getByRole("button", { name: "Skip" }).click();
  await call(page, "Lower");
  await shot(page, "dark-phone-home-revealed");
  await go(page, "/daily");
  await shot(page, "dark-phone-daily", false);
  await ctx.close();
}

await browser.close();
await writeFile(`${OUT}/errors.txt`, errors.length ? errors.join("\n") : "no console errors\n");
console.log(errors.length ? `${errors.length} console errors` : "no console errors");
