// client/src/lib/playerDisplay.ts
// Thin re-export layer — canonical implementations live in sportConfig.ts.
// Kept for backwards compatibility with existing imports.

export {
  isPitcher,
  normalizePosition,
  getMlbTeamAbbr,
} from "./sportConfig";

import { fmtRate } from "./sportConfig";

/** Format a batting average value, coercing to number. Alias for fmtRate with coercion. */
export function formatAvg(v: string | number | null | undefined): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return fmtRate(n);
}
