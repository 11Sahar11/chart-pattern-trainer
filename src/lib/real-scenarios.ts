import type { Scenario } from "@/lib/market";
import { scenarios as practiceScenarios } from "@/lib/scenarios";
import data from "@/data/real-scenarios.json";
import momentData from "@/data/moments.json";

/** Built by `npm run data:yahoo`. Empty until the script has been run. */
export const realScenarios = data as unknown as Scenario[];

export type MomentScenario = Scenario & { pack: string };
/** Famous Moments, built by the same script. Empty until it has been run. */
export const moments = momentData as unknown as MomentScenario[];

export type MomentPack = { id: string; name: string; description: string };
export const momentPacks: MomentPack[] = [
  {
    id: "crashes",
    name: "Crashes",
    description: "The days before the market's worst drops. Would you have seen it coming?",
  },
  {
    id: "manias",
    name: "Manias and squeezes",
    description: "Meme stocks, crypto tops and the runs everyone talked about.",
  },
  {
    id: "shocks",
    name: "Earnings shocks and turns",
    description: "Big gaps on earnings, and bottoms nobody believed.",
  },
];

export const scenarioById = new Map<string, Scenario>(
  [...practiceScenarios, ...realScenarios, ...moments].map((s) => [s.id, s]),
);
