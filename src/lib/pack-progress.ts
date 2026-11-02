/** Per-pack results for Famous Moments: scenario id -> called right. */
export type PackResults = Record<string, boolean>;

const key = (pack: string) => `cpt-pack-${pack}`;

export function loadPack(pack: string): PackResults {
  try {
    return (JSON.parse(localStorage.getItem(key(pack)) ?? "null") as PackResults | null) ?? {};
  } catch {
    return {};
  }
}

export function savePackResult(pack: string, id: string, right: boolean): PackResults {
  const next = { ...loadPack(pack), [id]: right };
  try {
    localStorage.setItem(key(pack), JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
