# FBST Data Schemas

Source of truth for JSON produced by the stats worker and served by the FBST API.
All fields are required unless noted otherwise.

---

## 1. `GET /api/season-standings`

```ts
type SeasonStandingsResponse = {
  periodIds: number[];  // e.g. [1,2,3,4,5,6]
  rows: SeasonStandingsRow[];
};

type SeasonStandingsRow = {
  teamId: number;
  teamName: string;
  owner: string;

  // season totals
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;   // 3+ decimal places
  W: number;
  S: number;
  K: number;
  ERA: number;
  WHIP: number;

  // roto points by category (1–N teams)
  categoryPoints: {
    R: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    W: number;
    S: number;
    K: number;
    ERA: number;
    WHIP: number;
  };

  totalPoints: number; // sum of categoryPoints
};


## 2.  'GET /api/period-standings?periodId=<id>
type PeriodStandingsResponse = {
  periodId: number;
  rows: PeriodStandingsRow[];
};

type PeriodStandingsRow = {
  teamId: number;
  teamName: string;
  owner: string;

  // period totals
  R: number;
  HR: number;
  RBI: number;
  SB: number;
  AVG: number;
  W: number;
  S: number;
  K: number;
  ERA: number;
  WHIP: number;

  // roto points (this period only)
  categoryPoints: {
    R: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    W: number;
    S: number;
    K: number;
    ERA: number;
    WHIP: number;
  };

  totalPoints: number;
};



## 3.  'GET /api/players
type PlayersResponse = {
  hitters: HitterRow[];
  pitchers: PitcherRow[];
};

type BasePlayerRow = {
  playerId: number;
  mlbId: string;
  name: string;
  mlbTeam: string; // e.g. "LAD"
  team: string;    // OGBA team name or "-" if FA
  status: "Active" | "Reserve" | "Free agent" | string;
  gamesByPos: { [pos: string]: number }; // { "C": 5, "1B": 12, ... }
};

type HitterRow = BasePlayerRow & {
  isPitcher: false;
  stats: {
    G: number;
    AB: number;
    R: number;
    H: number;
    HR: number;
    RBI: number;
    SB: number;
    AVG: number;
    GS: number;
  };
};

type PitcherRow = BasePlayerRow & {
  isPitcher: true;
  stats: {
    G: number;
    IP: number;
    ER: number;
    H: number;
    BB: number;
    SO: number;
    W: number;
    S: number;
    ERA: number;
    WHIP: number;
  };
};