import type { Scenario } from "@/lib/market";

export type Pattern = {
  slug: string;
  /** Practice setup id that demonstrates this pattern. */
  scenarioId: string;
  name: string;
  bias: "Bearish reversal" | "Bullish reversal" | "Bullish continuation" | "Bearish continuation" | "Trap" | "Momentum warning" | "Breakout";
  /** Under ~155 characters: used as the meta description. */
  summary: string;
  whatItIs: string;
  howToSpot: string[];
  confirmation: string;
  failure: string;
  indicators: string;
};

export const patterns: Pattern[] = [
  {
    slug: "head-and-shoulders",
    scenarioId: "hs-top",
    name: "Head and Shoulders",
    bias: "Bearish reversal",
    summary:
      "Learn to spot a head and shoulders top, where to draw the neckline, and what confirms the break. Then practice on a chart that stops before the move.",
    whatItIs:
      "Three peaks after an uptrend: a left shoulder, a higher head, and a lower right shoulder. The lows between them form the neckline. Buyers make one last push to a new high, fail to hold it, and then cannot even reach that high on the next rally.",
    howToSpot: [
      "An uptrend first. Without a trend to reverse, three peaks are just a range.",
      "A head clearly above both shoulders, with shoulders at roughly similar heights.",
      "A neckline through the two reaction lows. Flat or slightly sloped both count.",
      "A right shoulder that stalls below the head: the first sign buyers are tiring.",
    ],
    confirmation:
      "A close below the neckline, ideally on rising volume. Until that close, it is a possible pattern, not a completed one.",
    failure:
      "Price holds the neckline and rallies back above the right shoulder. Many shoulders never break, and a failed top can turn into a strong move up.",
    indicators:
      "Volume often shrinks on the right shoulder and expands on the break. RSI frequently makes a lower high at the head, which is bearish divergence.",
  },
  {
    slug: "inverse-head-and-shoulders",
    scenarioId: "ihs",
    name: "Inverse Head and Shoulders",
    bias: "Bullish reversal",
    summary:
      "The inverse head and shoulders is a bottoming pattern. See how the neckline breakout works, then call a real setup before it resolves.",
    whatItIs:
      "The mirror image of the top: three troughs after a downtrend, with the middle one (the head) the lowest. Sellers push to a new low, fail to keep it, and the next dip stops higher.",
    howToSpot: [
      "A downtrend leading in.",
      "A head below both shoulders, and a right shoulder that holds above the head.",
      "A neckline across the two rally highs between the troughs.",
    ],
    confirmation:
      "A close above the neckline with expanding volume. A retest of the neckline from above that holds is a common second chance.",
    failure:
      "A break back below the right shoulder low. Bottoms take time, and the first neckline break can fail.",
    indicators:
      "Volume tends to grow on the rallies inside the pattern. A rising 20-day average under price on the breakout supports the turn.",
  },
  {
    slug: "double-top",
    scenarioId: "double-top",
    name: "Double Top",
    bias: "Bearish reversal",
    summary:
      "A double top is two failed attempts at the same high. Learn what makes it valid, where it confirms, and practice reading one before the break.",
    whatItIs:
      "Price rallies to a high, pulls back, rallies to roughly the same high again and fails. The low between the two peaks is the trigger level.",
    howToSpot: [
      "Two peaks at about the same price, separated by a clear pullback.",
      "Weaker momentum or volume on the second peak than on the first.",
      "A trigger at the low between the peaks.",
    ],
    confirmation: "A close below the middle low. Before that, two equal highs are just resistance.",
    failure:
      "A close above both peaks. Failed double tops often run hard because traders who shorted the second peak have to buy back.",
    indicators: "RSI making a lower high on the second peak, and lighter volume on the second push.",
  },
  {
    slug: "double-bottom",
    scenarioId: "double-bottom",
    name: "Double Bottom",
    bias: "Bullish reversal",
    summary:
      "The double bottom, or 'W' pattern, marks sellers failing twice at the same low. Learn the trigger and practice calling it.",
    whatItIs:
      "Price drops to a low, bounces, returns to roughly the same low and holds. The high between the two lows is the trigger.",
    howToSpot: [
      "Two lows at about the same price after a decline.",
      "Selling pressure easing on the second low: smaller candles, lighter volume.",
      "A trigger at the bounce high between the lows.",
    ],
    confirmation: "A close above the middle high, ideally with volume picking up.",
    failure: "A close below both lows, which often accelerates the decline.",
    indicators: "Bullish RSI divergence (a higher RSI low on the second price low) is a common companion.",
  },
  {
    slug: "ascending-triangle",
    scenarioId: "asc-tri",
    name: "Ascending Triangle",
    bias: "Bullish continuation",
    summary:
      "An ascending triangle pairs flat resistance with rising lows. See why buyers usually win it, and practice the breakout call.",
    whatItIs:
      "Sellers defend a flat ceiling while buyers step in at higher and higher lows. The range tightens until one side gives way, usually the ceiling.",
    howToSpot: [
      "At least two touches of a flat resistance line.",
      "At least two higher lows forming a rising trendline.",
      "Price compressing into the apex.",
    ],
    confirmation: "A close above the flat resistance, with volume rising on the break.",
    failure: "A close below the rising trendline. The pattern then often turns into a sharp drop.",
    indicators: "Volume usually contracts inside the triangle and expands on the breakout.",
  },
  {
    slug: "descending-triangle",
    scenarioId: "desc-tri",
    name: "Descending Triangle",
    bias: "Bearish continuation",
    summary:
      "A descending triangle combines flat support with lower highs. Learn to read the pressure building on support and call the break.",
    whatItIs:
      "Buyers defend a flat floor while each rally stalls lower. Every bounce is weaker until support gives way.",
    howToSpot: [
      "Flat support touched two or more times.",
      "Lower highs forming a falling trendline.",
      "Bounces off support getting smaller.",
    ],
    confirmation: "A close below support, ideally on heavier volume.",
    failure: "A close above the falling trendline, which can trap late sellers.",
    indicators: "A falling 20-day average above price and fading bounce volume support the bearish read.",
  },
  {
    slug: "bull-flag",
    scenarioId: "bull-flag",
    name: "Bull Flag",
    bias: "Bullish continuation",
    summary:
      "A bull flag is a short, orderly pause after a sharp rally. Learn how to tell a healthy flag from a reversal, then practice the call.",
    whatItIs:
      "A strong, fast rally (the pole) followed by a tight, slightly downward drift (the flag) on lighter volume. The trend rests, then continues.",
    howToSpot: [
      "A steep pole on strong volume.",
      "A flag that retraces only a small part of the pole, often under half.",
      "Volume drying up during the flag.",
    ],
    confirmation: "A break above the top of the flag, with volume returning.",
    failure:
      "The flag sinks deep into the pole or breaks its low. A flag that keeps sagging is a reversal in progress.",
    indicators: "Price holding above a rising 20-day average during the flag, and low flag volume.",
  },
  {
    slug: "failed-double-top",
    scenarioId: "failed-top",
    name: "Failed Double Top",
    bias: "Trap",
    summary:
      "Not every double top breaks down. Learn how a failed top traps sellers and fuels a move up, and practice spotting the trap.",
    whatItIs:
      "Two equal highs look like a double top, but price never closes below the middle low. Instead it pushes through the highs, and traders who sold the pattern are forced to buy back.",
    howToSpot: [
      "A clean-looking double top in an uptrend.",
      "Shallow pullbacks that never reach the trigger low.",
      "Buyers stepping in quickly near the highs instead of fading.",
    ],
    confirmation: "A close above both highs. The trap is complete when the obvious short stops out.",
    failure: "If price does close below the middle low, it was a real double top after all.",
    indicators:
      "Volume rising into the highs instead of fading, and RSI holding up rather than diverging.",
  },
  {
    slug: "rsi-divergence",
    scenarioId: "rsi-div",
    name: "RSI Divergence",
    bias: "Momentum warning",
    summary:
      "RSI divergence shows momentum fading before price turns. Learn bullish and bearish divergence and practice reading it on a chart.",
    whatItIs:
      "Price makes a new high (or low) but RSI does not. Momentum behind the move is weakening, which often precedes a pullback or reversal.",
    howToSpot: [
      "Bearish: a higher high in price with a lower high in RSI.",
      "Bullish: a lower low in price with a higher low in RSI.",
      "Most useful at the end of an extended move, not in a range.",
    ],
    confirmation:
      "Divergence is a warning, not a signal. Wait for price itself to break structure, such as a trendline or the last swing low.",
    failure: "Strong trends can stay divergent for a long time while price keeps going.",
    indicators: "RSI 14 is the standard setting. Combine it with volume and price structure.",
  },
  {
    slug: "breakaway-gap",
    scenarioId: "gap-up",
    name: "Breakaway Gap",
    bias: "Breakout",
    summary:
      "A breakaway gap launches price out of a range. Learn how it differs from gaps that fill, and practice calling the follow-through.",
    whatItIs:
      "After a long sideways range, price opens beyond the range and never trades back into it. It marks the start of a new move rather than noise.",
    howToSpot: [
      "A clear range or base before the gap.",
      "The gap leaves the range entirely.",
      "Heavy volume on the gap day.",
    ],
    confirmation: "The gap stays open over the next sessions. Holding above the old range is the tell.",
    failure: "Price falls back inside the range. Gaps inside ranges fill all the time.",
    indicators: "Volume many times the range average on the gap day.",
  },
];

export const patternBySlug = new Map(patterns.map((p) => [p.slug, p]));
const slugByScenario = new Map(patterns.map((p) => [p.scenarioId, p.slug]));

/** Friendly names for the condition tags the data script puts on real charts. */
export const tagLabels: Record<string, string> = {
  uptrend: "Charts in an uptrend",
  downtrend: "Charts in a downtrend",
  range: "Sideways charts",
  overbought: "RSI overbought (70+)",
  oversold: "RSI oversold (30 and under)",
  "volume-spike": "Volume spikes",
  moment: "Famous Moments",
  ...Object.fromEntries(patterns.map((p) => [p.slug, p.name])),
};

export function tagsFor(s: Scenario): string[] {
  if (s.tags?.length) return s.tags;
  const slug = slugByScenario.get(s.id);
  return slug ? [slug] : [];
}

export function patternForTag(tag: string): Pattern | undefined {
  return patternBySlug.get(tag);
}
