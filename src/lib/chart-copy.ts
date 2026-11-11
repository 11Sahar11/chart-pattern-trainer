import type { Scenario } from "@/lib/market";

/** One sentence about the chart as it stood at the call. The result line carries the outcome. */
export function chartSentence(scenario: Scenario): string {
  const blurb = scenario.source?.blurb?.trim();
  if (blurb) return clip(firstSentence(blurb));
  const text = scenario.explanation.trim();
  if (text.startsWith("Real daily chart.")) return clip(firstSentence(text.slice("Real daily chart.".length)));
  return clip(firstSentence(text));
}

function firstSentence(text: string): string {
  const match = text.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

function clip(sentence: string): string {
  if (sentence.length <= 180) return sentence;
  const cut = sentence.slice(0, 177);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trimEnd()}…`;
}
