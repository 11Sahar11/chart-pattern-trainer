import type { Scenario } from "@/lib/market";
import data from "@/data/real-scenarios.json";

/** Built by `npm run data:yahoo`. Empty until the script has been run. */
export const realScenarios = data as unknown as Scenario[];
