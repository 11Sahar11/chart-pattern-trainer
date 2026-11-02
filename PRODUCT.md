# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyone who wants to read price charts better: beginners learning patterns and indicators for the first time, active traders sharpening their read, and the owner using it as a personal drill. Played on phone and desktop in equal measure — short rounds on the go and focused sessions at a desk.

## Product Purpose

A chart-reading drill. A price chart stops before the move; the player optionally adds indicators (SMA 20, EMA 12, volume, RSI 14), calls the next move — higher, lower, or no edge — then sees what actually happened, the pattern, and which indicators agreed or misled. Success is a player who gets measurably better at reading a chart and learns when there is no edge.

## Positioning

Most chart games only score right or wrong. This one also tells the player which tools helped on that chart, treats "no edge" as a real answer, and (in Real charts mode) uses actual historical daily candles with ticker and dates hidden until the call.

## Capabilities and Constraints

- Two decks: Practice (10 hand-authored textbook setups with explanations) and Real charts (generated from Yahoo Finance daily data by `npm run data:yahoo`, rebased to 100, ticker and dates hidden until the call).
- Each setup: 60 candles shown, 20 revealed after the call. Outcome is judged against the chart's own volatility.
- Score, hit rate, streak and best are kept per deck in the browser (localStorage). No accounts.
- Charts render with lightweight-charts. Stack: TanStack Start + Tailwind v4, deployed on Vercel.
- Educational only; not trading advice. Yahoo data is personal/educational use.
- Open: interface language (English today; Hebrew/RTL possible), name, and light/dark are all open to change.
