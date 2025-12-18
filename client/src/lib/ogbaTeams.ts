// client/src/lib/ogbaTeams.ts
//
// Single source of truth for OGBA team display names.
// Update these to your real team names.

export const OGBA_TEAM_NAMES: Record<string, string> = {
    DDG: "Dodger Dawgs",
    DLC: "Demolition Lumber Co.",
    DMK: "Diamond Kings",
    DVD: "Devil Dawgs",
    LDY: "Los Doyers",
    RGS: "RGing Sluggers",
    SKD: "Skunk Dogs",
    TSH: "The Show",
  };
  
  export function getOgbaTeamName(teamCode: string): string {
    const code = String(teamCode ?? "").trim().toUpperCase();
    return OGBA_TEAM_NAMES[code] ?? `Team ${code || "?"}`;
  }
  