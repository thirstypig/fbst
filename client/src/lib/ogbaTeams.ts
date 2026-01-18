// client/src/lib/ogbaTeams.ts
//
// Single source of truth for OGBA team display names.
// Update these to your real team names.

export const OGBA_TEAM_NAMES: Record<string, string> = {
  // 2025 Historical Team Codes
  DD2: "Devil Dawgs",
  DDD: "Dodger Dawgs",
  DKD: "Diamond Kings",
  DLC: "Demolition Lumber Co.",
  LDL: "Los Doyers",
  RSR: "Raging Sluggers",
  SDS: "Skunk Dogs",
  TST: "The Show",
  
  // Legacy codes (backward compatible)
  DDG: "Dodger Dawgs",
  DMK: "Demolition Lumber Co.", // Corrected from legacy mismatch
  DKG: "Diamond Kings",
  DEV: "Devil Dawgs",
  DVD: "Devil Dawgs",
  LDY: "Los Doyers",
  RGS: "Raging Sluggers",
  SKD: "Skunk Dogs",
  SHO: "The Show",
  TSH: "The Show",
};

export function getOgbaTeamName(teamCode: string): string {
  const code = String(teamCode ?? "").trim().toUpperCase();
  return OGBA_TEAM_NAMES[code] ?? `Team ${code || "?"}`;
}