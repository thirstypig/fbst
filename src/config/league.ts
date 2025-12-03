// src/config/league.ts

export type DraftMode = 'auction' | 'draft';
export type DraftOrder = 'snake' | 'linear';

export interface DraftSettings {
  mode: DraftMode;
  order: DraftOrder | null; // null when mode = 'auction'
}

export const CURRENT_LEAGUE = {
  id: 'ogba',
  name: 'OGBA',
  season: 2026,
  draftSettings: {
    mode: 'auction' as DraftMode,
    order: null,
  } as DraftSettings,
};
