import { buildCandles, swing, type Scenario } from "@/lib/market";

export const scenarios: Scenario[] = [
  {
    id: "hs-top",
    pattern: "Head and shoulders top",
    correct: "down",
    revealAt: 40,
    guides: [{ price: 100, title: "Neckline" }],
    useful: ["volume", "rsi"],
    candles: buildCandles(
      swing(
        [
          [0, 96],
          [8, 110],
          [14, 99.5],
          [23, 124],
          [31, 100.2],
          [38, 111],
          [40, 103],
          [48, 88],
          [54, 82],
        ],
        11,
        0.35,
        [23, 46],
      ),
      11,
    ),
    explanation:
      "A left shoulder, a higher head, and a lower right shoulder sat on a flat neckline near 100. The right shoulder stalled under the head, and the next push failed to hold the neckline. That break is the classic completion of a head-and-shoulders top.",
    indicatorNote:
      "Volume faded on the right shoulder and expanded on the break. RSI failed to confirm the head with a matching high, so momentum was already rolling over.",
    caution:
      "The pattern is not complete until price closes through the neckline. Many shoulders never break.",
  },
  {
    id: "ihs",
    pattern: "Inverse head and shoulders",
    correct: "up",
    revealAt: 40,
    guides: [{ price: 108, title: "Neckline" }],
    useful: ["volume", "sma"],
    candles: buildCandles(
      swing(
        [
          [0, 118],
          [8, 98],
          [15, 109],
          [23, 84],
          [31, 107.5],
          [38, 96],
          [40, 105],
          [48, 122],
          [54, 130],
        ],
        17,
        0.35,
        [23, 46],
      ),
      17,
    ),
    explanation:
      "Selling made a left shoulder, a deeper head, and a higher right shoulder under a neckline near 108. Buyers defended each pullback, then price cleared the neckline and kept going. That is the bullish mirror of a head and shoulders.",
    indicatorNote:
      "Volume was heaviest at the head and again on the breakout. The 20-day average, which had capped rallies, flattened and then turned up under price.",
    caution: "A neckline poke that immediately falls back is not a completed reversal.",
  },
  {
    id: "double-top",
    pattern: "Double top",
    correct: "down",
    revealAt: 36,
    guides: [{ price: 102, title: "Neckline" }],
    useful: ["volume", "rsi"],
    candles: buildCandles(
      swing(
        [
          [0, 90],
          [10, 118],
          [18, 102],
          [28, 117.2],
          [36, 104],
          [44, 90],
          [50, 84],
        ],
        23,
        0.3,
        [10, 42],
      ),
      23,
    ),
    explanation:
      "Price tagged the same ceiling twice and could not hold a new high. The valley between the peaks, near 102, was the line that mattered. Once that shelf gave way, the failed retest of the highs became a completed double top.",
    indicatorNote:
      "The second peak printed on lighter volume, and RSI made a lower high while price was almost equal. Both said buyers were less committed the second time.",
    caution: "Two peaks alone are not a signal. Wait for the midpoint to break.",
  },
  {
    id: "double-bottom",
    pattern: "Double bottom",
    correct: "up",
    revealAt: 36,
    guides: [{ price: 118, title: "Neckline" }],
    useful: ["volume", "rsi"],
    candles: buildCandles(
      swing(
        [
          [0, 132],
          [10, 102],
          [18, 118],
          [28, 101.4],
          [36, 114],
          [44, 132],
          [50, 140],
        ],
        29,
        0.3,
        [10, 42],
      ),
      29,
    ),
    explanation:
      "Price washed out to the same low twice, and the second test held. The rally between the lows set a neckline near 118. Clearing that line turned the W into a reversal rather than just a pause in the decline.",
    indicatorNote:
      "RSI held a higher low on the second test — bullish divergence against a flat price low. Volume picked up as price left the base.",
    caution: "A double bottom that never clears the midpoint is still a range.",
  },
  {
    id: "asc-tri",
    pattern: "Ascending triangle",
    correct: "up",
    revealAt: 38,
    guides: [{ price: 120, title: "Resistance" }],
    useful: ["volume", "ema"],
    candles: buildCandles(
      swing(
        [
          [0, 108],
          [4, 120],
          [8, 104],
          [12, 119.8],
          [16, 108],
          [20, 120],
          [24, 112],
          [28, 119.7],
          [32, 115],
          [36, 119.5],
          [38, 117.5],
          [44, 128],
          [50, 136],
        ],
        31,
        0.18,
        [42],
      ),
      31,
    ),
    explanation:
      "Sellers kept a lid near 120 while each dip bottomed higher. That rising demand against a flat ceiling is an ascending triangle. The coil resolved upward, and the old ceiling became support.",
    indicatorNote:
      "Volume dried up inside the coil and expanded on the break. The 12-day average tracked the rising lows and then trailed the breakout.",
    caution: "Triangles break the wrong way often enough that the close beyond the line matters more than the shape.",
  },
  {
    id: "desc-tri",
    pattern: "Descending triangle",
    correct: "down",
    revealAt: 34,
    guides: [{ price: 100, title: "Support" }],
    useful: ["volume", "sma"],
    candles: buildCandles(
      swing(
        [
          [0, 118],
          [5, 100.2],
          [10, 115],
          [15, 100.1],
          [20, 111],
          [25, 100.3],
          [30, 107],
          [34, 101.2],
          [40, 92],
          [46, 84],
        ],
        37,
        0.18,
        [38],
      ),
      37,
    ),
    explanation:
      "Buyers defended a flat floor near 100, but each bounce peaked lower. Supply was leaning on the same support. When the floor finally gave way, the descending triangle completed to the downside.",
    indicatorNote:
      "The 20-day average rolled over and sat on the falling peaks. Volume stayed quiet until the support break.",
    caution: "A flat support line attracts both breakdown sellers and dip buyers. Location of the close decides which side won.",
  },
  {
    id: "bull-flag",
    pattern: "Bull flag",
    correct: "up",
    revealAt: 30,
    guides: [],
    useful: ["ema", "volume"],
    candles: buildCandles(
      swing(
        [
          [0, 80],
          [8, 110],
          [12, 105],
          [16, 107],
          [20, 102.5],
          [24, 105.5],
          [28, 101],
          [30, 103],
          [36, 116],
          [44, 126],
        ],
        41,
        0.25,
        [6, 36],
      ),
      41,
    ),
    explanation:
      "A sharp impulse stalled into a short, orderly drift lower — a flag, not a reversal. The pullback stayed shallow relative to the pole. Price then left the channel in the direction of the original surge.",
    indicatorNote:
      "Volume collapsed during the drift and returned on the continuation. The 12-day average caught price during the flag and held.",
    caution: "If a flag gives back most of the pole, it has stopped being a continuation pattern.",
  },
  {
    id: "failed-top",
    pattern: "Failed double top",
    correct: "up",
    revealAt: 32,
    guides: [{ price: 117, title: "Prior high" }],
    useful: ["volume", "rsi"],
    candles: buildCandles(
      swing(
        [
          [0, 92],
          [9, 117],
          [16, 103],
          [25, 115.5],
          [32, 108],
          [38, 122],
          [46, 132],
        ],
        43,
        0.28,
        [38],
      ),
      43,
    ),
    explanation:
      "This looked like a double top: two pushes into the same area, then a dip. The textbook call was lower. Instead price closed through the prior high and kept going. The pattern failed, and the failed sellers became fuel.",
    indicatorNote:
      "The dip after the second peak never produced a volume climax, and RSI stayed elevated instead of breaking down. Strength that refuses to reset is a warning not to fade the highs.",
    caution:
      "Calling the shape is not the same as calling the trade. A pattern that is invalidated deserves a new read, not a bigger position.",
  },
  {
    id: "rsi-div",
    pattern: "Bearish RSI divergence",
    correct: "down",
    revealAt: 50,
    guides: [],
    useful: ["rsi", "volume"],
    candles: buildCandles(
      swing(
        [
          [0, 100],
          [12, 103],
          [18, 120],
          [26, 104],
          [34, 108],
          [44, 124],
          [48, 119],
          [56, 98],
          [62, 90],
        ],
        47,
        0.22,
        [18],
      ),
      47,
    ),
    explanation:
      "Price printed a higher high, which looks bullish on the candles alone. The second rally was a slow grind after a sharp first leg, and it did not stick. The move that followed gave back the breakout.",
    indicatorNote:
      "RSI was the tell: it made a lower high while price made a higher one. Volume on the second push was also quieter than the first impulse. Without RSI, the higher high is easy to trust.",
    caution: "Divergence can persist for a long time in a strong trend. It is a warning, not a clock.",
  },
  {
    id: "gap-up",
    pattern: "Breakaway gap",
    correct: "up",
    revealAt: 32,
    guides: [{ price: 106, title: "Range high" }],
    useful: ["volume", "sma"],
    candles: buildCandles(
      [
        ...swing(
          [
            [0, 100],
            [6, 106],
            [12, 100.4],
            [18, 105.6],
            [24, 101],
            [30, 104.8],
            [32, 103.2],
          ],
          53,
          0.2,
        ),
        { close: 112, open: 108.4, volume: 3_400_000 },
        { close: 114.5, volume: 2_200_000 },
        { close: 113.2, volume: 1_600_000 },
        { close: 116.8, volume: 1_900_000 },
        { close: 119.4, volume: 1_700_000 },
        { close: 121, volume: 1_500_000 },
      ],
      53,
    ),
    explanation:
      "Price spent weeks trapped between roughly 100 and 106. The next session did not open inside that box — it opened above it and never filled the gap. A gap out of a range, on heavy volume, is a breakaway rather than noise.",
    indicatorNote:
      "Volume on the gap day dwarfed the sessions inside the range. The 20-day average, which had gone flat, was left underneath the gap and became a reference if the move was tested.",
    caution: "Gaps inside a range fill constantly. The context — leaving a congestion area — is what makes this one different.",
  },
];

export const indicatorLabels: Record<Scenario["useful"][number], string> = {
  sma: "SMA 20",
  sma50: "SMA 50",
  ema: "EMA 12",
  bb: "Bollinger",
  volume: "Volume",
  obv: "OBV",
  rsi: "RSI 14",
  macd: "MACD",
  stoch: "Stochastic",
};
