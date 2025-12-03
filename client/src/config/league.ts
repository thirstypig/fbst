// client/src/config/league.ts

export type DraftMode = "auction" | "draft";
export type DraftOrder = "snake" | "linear";

export interface DraftSettings {
  mode: DraftMode;
  order: DraftOrder | null; // null when mode = "auction"
}

export interface LeagueConfig {
  id: string;
  name: string;
  season: number;
  draftSettings: DraftSettings;
}

/**
 * Current league config.
 * For now this is OGBA, but the app is structured
 * so we can later load this dynamically per leagueId.
 */
export const CURRENT_LEAGUE: LeagueConfig = {
  id: "ogba",
  name: "OGBA",
  season: 2026,
  draftSettings: {
    mode: "auction",
    order: null,
  },
};
