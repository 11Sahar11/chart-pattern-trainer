# Launch kit — US audience

Who it's for: Americans who are learning to trade or invest and want to get better at reading charts
without risking money. The two promises: **free, no sign-up**, and **"no edge" is a real answer**.

Before posting anywhere: set `VITE_SITE_URL` in Vercel (share cards and the sitemap need it), run
`npm run data:yahoo` so Real charts and Famous Moments are filled, and play the Daily yourself.

## Order of operations

1. **Week 1 — soft launch.** Post the Daily to friends; fix anything confusing.
2. **Week 1 — Google Search Console.** Add the site and submit `/sitemap.xml` so the pattern pages
   get indexed. These pages are the long-term free traffic.
3. **Week 2 — Reddit** (one community at a time, a few days apart).
4. **Week 2 — Product Hunt** on a Tuesday–Thursday.
5. **Ongoing — short videos** (TikTok, YouTube Shorts, Instagram Reels) built from Famous Moments.

## Reddit

Read each subreddit's rules first; several only allow self-promotion in a weekly thread. Post as a
person, reply to every comment, and never post the same text twice.

**r/Daytrading** (beginner-heavy) — title:
> I built a free drill for reading charts before the move: it tells you which indicators actually helped

Body:
> Most chart games just score right or wrong. I wanted something that also shows *why*: you add the
> indicators you'd trust (SMA, EMA, volume, RSI), call higher / lower / no edge, then the hidden candles
> plot and it tells you which indicators agreed with the move and which misled you.
>
> Real charts hide the ticker and dates so you can't cheat. "No edge" counts as a real answer, because a
> lot of charts genuinely don't resolve, and learning to sit out is half the skill.
>
> There's a Daily Chart (5 charts, same for everyone) if you want to compare scores. Free, no account,
> nothing to buy. Feedback welcome, especially on charts you think are scored wrong.

**r/StockMarket / r/stocks** — lead with Famous Moments:
> Would you have called these? The COVID crash, GameStop, NVIDIA's AI gap — charts stopped the day
> before, story hidden

**r/technicalanalysis** — lead with the pattern pages and ask for critique of the explanations.

## Product Hunt

- **Name:** Chart Pattern Trainer
- **Tagline (60 max):** Call the next move on real stock charts, then see why
- **Description:** A free chart-reading drill. The chart stops before the move; you call it higher,
  lower or no edge, and see what happened and which indicators helped. Daily Chart, Famous Moments
  from market history, and a page for every classic pattern. No account needed.
- **First comment:** why you built it, the "no edge" idea, and what you want feedback on.

## Short videos (no editing skills needed)

Screen-record the app on your phone:

1. "Would you have sold here?" — open a Famous Moment, pause on the chart 3 seconds, make the call,
   let the reveal play. Caption the title only after the reveal.
2. "Daily Chart #N — I got 2/5. Beat me." Post the score grid daily for a streak of content.
3. "This pattern fools everyone" — the failed double top page, then the drill.

Hashtags: #stocks #trading #daytrading #stockmarket #chartpatterns #investing

## What to watch

The app stores nothing on a server, so watch Vercel Analytics (page views) and Search Console
(queries per pattern page). Signals that it's working: people returning to `/daily`, pattern pages
appearing in search results, and Reddit comments asking for more Moments.

---

# Pro plan (not built yet)

Keep the core free forever: Practice, Daily Chart, pattern pages and a few Moments. Charge for depth.

**Price:** $2.99/month or $19.99/year, with a 7-day trial. That sits under CandleBoss ($4.99/mo,
$29.99/yr, $49.99 lifetime as of November 2026).

**Pro features:** all Famous Moments packs (new pack monthly), unlimited Real charts with filters
(sector, trend, volatility), intraday charts, detailed stats history, and streak repair.

**What it takes to build:**

1. **Payments.** On Android the app must use Google Play Billing for digital content. A TWA does this
   through the Digital Goods API plus the Payment Request API, and the subscription products are set
   up in Play Console. On the website, Stripe Checkout.
2. **A small backend** to verify purchases and remember who is Pro across devices (for example, a
   Vercel function plus a database such as Vercel Postgres or Supabase). This also means adding
   sign-in, a privacy policy update and new Data safety answers.
3. **A data licence.** Yahoo data is fine for a free educational tool; once you charge, switch to a
   provider whose licence allows commercial display (for example Polygon, Tiingo or Twelve Data).

Start Pro only after the free app has steady daily players; until then, growth matters more than
revenue.
