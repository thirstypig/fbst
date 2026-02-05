export interface SeasonStatRow {
  mlb_id: string;
  mlbId?: string;
  player_name?: string;
  name?: string;
  playerName?: string;
  mlb_full_name?: string;
  
  ogba_team_code?: string;
  team?: string;
  
  positions?: string;
  pos?: string;
  is_pitcher?: boolean | string;
  isPitcher?: boolean | string;
  
  AB?: number | string;
  H?: number | string;
  R?: number | string;
  HR?: number | string;
  RBI?: number | string;
  SB?: number | string;
  AVG?: number | string;
  
  GS?: number | string;
  W?: number | string;
  SV?: number | string;
  K?: number | string;
  ERA?: number | string;
  WHIP?: number | string;
  SO?: number | string; // shutouts
  shutouts?: number | string;

  mlb_team?: string;
  mlbTeam?: string;
  
  // Normalized fields added by DataService
  fantasy_value?: number;
}

export interface PeriodStatRow {
  periodId?: number | string;
  period_id?: number | string;
  
  mlb_id?: string;
  mlbId?: string;
  
  AB?: number | string;
  H?: number | string;
  R?: number | string;
  HR?: number | string;
  RBI?: number | string;
  SB?: number | string;
  AVG?: number | string;
  
  W?: number | string;
  SV?: number | string;
  K?: number | string;
  ERA?: number | string;
  WHIP?: number | string;
  GS?: number | string;
}
