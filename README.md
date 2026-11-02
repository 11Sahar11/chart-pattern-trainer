# Chart Pattern Trainer

Practice reading a chart before the move. Add SMA, EMA, volume, or RSI, call higher / lower / no edge, then see the pattern and which indicator actually helped.

Ten setups: head and shoulders, inverse head and shoulders, double top and bottom, ascending and descending triangles, bull flag, a failed double top, RSI divergence, and a breakaway gap.

Score and streak stay in the browser. This is a drill, not a broker.

```bash
npm install
npm run dev
```

## Real charts from Yahoo Finance

The "Real charts" mode uses actual daily candles. Build the set once (Node 18+, needs internet):

```bash
npm run data:yahoo                       # ~30 tickers, 10 years, 8 setups each
npm run data:yahoo -- --per=15           # more setups per ticker
npm run data:yahoo -- --tickers=AAPL,TSLA,TEVA
```

This writes `src/data/real-scenarios.json`. Each setup shows 60 candles, then reveals the next 20.
Prices are rebased to 100 and dates are hidden, so the ticker can't be recognized until you commit.
The answer is "higher" or "lower" only when the move beats the chart's own volatility; otherwise it's "no edge".

Yahoo data is for personal and educational use. Use a licensed data provider before shipping this commercially.
