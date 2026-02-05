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
  RSR: "RGing Sluggers",
  SDS: "Skunk Dogs",
  TST: "The Show",
  
  // Legacy codes (backward compatible)
  DDG: "Dodger Dawgs",
  DMK: "Diamond Kings", // Corrected from legacy mismatch
  DKG: "Diamond Kings",
  DEV: "Devil Dawgs",
  DVD: "Devil Dawgs",
  LDY: "Los Doyers",
  RGS: "RGing Sluggers",
  SKD: "Skunk Dogs",
  SHO: "The Show",
  TSH: "The Show",
  FTP: "Foul Tip",
  BGU: "Big Unit",
  BSX: "The Black Sox",
  MNB: "Moneyball",
  // 2009 alternate team names
  BOH: "B.O.H.I.C.A.",
  FLU: "The Fluffers",
  // 2004 historical team names
  BCS: "NY Sock Exchange / Balcos",
  BRO: "Brothers Inc.",
};

export function getOgbaTeamName(teamCode: string): string {
  const code = String(teamCode ?? "").trim().toUpperCase();
  return OGBA_TEAM_NAMES[code] ?? `Team ${code || "?"}`;
}