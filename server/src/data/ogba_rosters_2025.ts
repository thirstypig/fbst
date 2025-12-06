// server/src/data/ogba_rosters_2025.ts
// OGBA 2025 fantasy rosters.
// This is intentionally simple: one row per player, keyed by mlb_id.
// Fill this out over time as you assign players to teams.

export type OgbaTeamName =
  | "Demolition Lumber Co."
  | "Devil Dawgs"
  | "Diamond Kings"
  | "Dodger Dawgs"
  | "Los Doyers"
  | "RGing Sluggers"
  | "Skunk Dogs"
  | "The Show";

export interface RosterEntry {
  mlb_id: string;      // MLBAM id, must match the CSV
  team: OgbaTeamName;  // OGBA team name (exactly as in Teams table)
  pos?: string;        // Fantasy position (optional)
}

/**
 * Start empty and add real rows as you go.
 * Example:
 *
 *   { mlb_id: "660761", team: "Los Doyers", pos: "SS" },
 *   { mlb_id: "671739", team: "Dodger Dawgs", pos: "OF" },
 */
export const OGBA_ROSTERS_2025: RosterEntry[] = [
  // TODO: fill with real rosters
];
