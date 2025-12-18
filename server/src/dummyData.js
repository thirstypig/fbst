// server/src/dummyData.js
// Dummy data that matches the data contract used by the client.

// ===== Season standings =====

export const dummySeasonStandings = {
    leagueId: 1,
    seasonYear: 2025,
    periods: [
      { id: 1, index: 1, name: "Period 1" },
      { id: 2, index: 2, name: "Period 2" },
      { id: 3, index: 3, name: "Period 3" },
      { id: 4, index: 4, name: "Period 4" },
      { id: 5, index: 5, name: "Period 5" },
      { id: 6, index: 6, name: "Period 6" }
    ],
    rows: [
      {
        teamId: 1,
        teamName: "Skunk Dogs",
        ownerName: "Tim Yuba",
        periodPoints: [65, 60, 62, 61, 59, 58],
        seasonPoints: 365
      },
      {
        teamId: 2,
        teamName: "Devil Dawgs",
        ownerName: "Gregg Iwamiya",
        periodPoints: [55, 50, 48, 50, 52, 50],
        seasonPoints: 305
      },
      {
        teamId: 3,
        teamName: "RGing Sluggers",
        ownerName: "Danny Wong",
        periodPoints: [50, 48, 47, 45, 40, 40],
        seasonPoints: 270.5
      },
      {
        teamId: 4,
        teamName: "Demolition Lumber Co.",
        ownerName: "Yuji Ogasa",
        periodPoints: [48, 44, 44, 42, 42, 42],
        seasonPoints: 262
      }
    ]
  };
  
  // ===== Period standings =====
  // Same shape for each period; client calls /api/period-standings?periodId=N
  
  const basePeriodStandings = {
    leagueId: 1,
    seasonYear: 2025,
    categories: [
      { id: "R", label: "R", decimals: 0, betterDirection: "higher" },
      { id: "HR", label: "HR", decimals: 0, betterDirection: "higher" },
      { id: "RBI", label: "RBI", decimals: 0, betterDirection: "higher" },
      { id: "SB", label: "SB", decimals: 0, betterDirection: "higher" },
      { id: "OBP", label: "OBP", decimals: 3, betterDirection: "higher" },
      { id: "SLG", label: "SLG", decimals: 3, betterDirection: "higher" },
      { id: "IP", label: "IP", decimals: 1, betterDirection: "higher" },
      { id: "W", label: "W", decimals: 0, betterDirection: "higher" },
      { id: "S", label: "S", decimals: 0, betterDirection: "higher" },
      { id: "K", label: "K", decimals: 0, betterDirection: "higher" },
      { id: "ERA", label: "ERA", decimals: 2, betterDirection: "lower" },
      { id: "WHIP", label: "WHIP", decimals: 2, betterDirection: "lower" }
    ]
  };
  
  // one example period; we'll reuse it for all 6 just so UI has something
  const period1Rows = [
    {
      teamId: 1,
      teamName: "Skunk Dogs",
      ownerName: "Tim Yuba",
      totals: {
        R: 40,
        HR: 11,
        RBI: 36,
        SB: 4,
        OBP: 0.351,
        SLG: 0.490,
        IP: 55.1,
        W: 5,
        S: 3,
        K: 68,
        ERA: 3.05,
        WHIP: 1.08
      },
      points: {
        R: 8,
        HR: 8,
        RBI: 8,
        SB: 7,
        OBP: 8,
        SLG: 8,
        IP: 7,
        W: 8,
        S: 8,
        K: 8,
        ERA: 8,
        WHIP: 8
      },
      periodPoints: 94
    },
    {
      teamId: 4,
      teamName: "Demolition Lumber Co.",
      ownerName: "Yuji Ogasa",
      totals: {
        R: 38,
        HR: 10,
        RBI: 34,
        SB: 3,
        OBP: 0.345,
        SLG: 0.480,
        IP: 52.1,
        W: 4,
        S: 2,
        K: 61,
        ERA: 3.20,
        WHIP: 1.15
      },
      points: {
        R: 7,
        HR: 6,
        RBI: 7,
        SB: 5,
        OBP: 7,
        SLG: 7,
        IP: 6,
        W: 6,
        S: 5,
        K: 7,
        ERA: 6,
        WHIP: 6
      },
      periodPoints: 75
    },
    {
      teamId: 2,
      teamName: "Devil Dawgs",
      ownerName: "Gregg Iwamiya",
      totals: {
        R: 32,
        HR: 8,
        RBI: 30,
        SB: 2,
        OBP: 0.330,
        SLG: 0.455,
        IP: 49.2,
        W: 3,
        S: 1,
        K: 55,
        ERA: 3.60,
        WHIP: 1.18
      },
      points: {
        R: 5,
        HR: 5,
        RBI: 5,
        SB: 4,
        OBP: 5,
        SLG: 5,
        IP: 5,
        W: 5,
        S: 3,
        K: 5,
        ERA: 5,
        WHIP: 5
      },
      periodPoints: 57
    }
  ];
  
  // map of periodId -> response
  export const dummyPeriodStandingsById = {
    1: {
      ...basePeriodStandings,
      periodId: 1,
      periodName: "Period 1",
      rows: period1Rows
    },
    2: {
      ...basePeriodStandings,
      periodId: 2,
      periodName: "Period 2",
      rows: period1Rows
    },
    3: {
      ...basePeriodStandings,
      periodId: 3,
      periodName: "Period 3",
      rows: period1Rows
    },
    4: {
      ...basePeriodStandings,
      periodId: 4,
      periodName: "Period 4",
      rows: period1Rows
    },
    5: {
      ...basePeriodStandings,
      periodId: 5,
      periodName: "Period 5",
      rows: period1Rows
    },
    6: {
      ...basePeriodStandings,
      periodId: 6,
      periodName: "Period 6",
      rows: period1Rows
    }
  };
  
  // ===== Players (hitters + pitchers) =====
  
  export const dummyPlayers = {
    leagueId: 1,
    seasonYear: 2025,
    players: [
      {
        playerId: 1001,
        playerName: "O'Hearn, Ryan",
        mlbTeam: "SD",
        ogbaTeamId: null,
        ogbaTeamName: null,
        status: "Free agent",
        isPitcher: false,
        G_DH: 18,
        G_C: 0,
        G_1B: 27,
        G_2B: 0,
        G_3B: 0,
        G_SS: 0,
        G_OF: 3,
        G_SP: 0,
        G_RP: 0,
        G_h: 83,
        AB: 597,
        R: 98,
        H: 173,
        "2B": 33,
        "3B": 5,
        HR: 20,
        RBI: 100,
        SB: 6,
        AVG: 0.29,
        OBP: 0.389,
        SLG: 0.462,
        GS: 161
      },
      {
        playerId: 1002,
        playerName: "Betts, Mookie",
        mlbTeam: "LAD",
        ogbaTeamId: 4,
        ogbaTeamName: "Demolition Lumber Co.",
        status: "Owned by Demolition Lumber Co.",
        isPitcher: false,
        G_DH: 10,
        G_C: 0,
        G_1B: 15,
        G_2B: 40,
        G_3B: 0,
        G_SS: 0,
        G_OF: 80,
        G_SP: 0,
        G_RP: 0,
        G_h: 135,
        AB: 590,
        R: 120,
        H: 180,
        "2B": 40,
        "3B": 3,
        HR: 32,
        RBI: 95,
        SB: 18,
        AVG: 0.305,
        OBP: 0.402,
        SLG: 0.55,
        GS: 150
      },
      {
        playerId: 2001,
        playerName: "Gallen, Zac",
        mlbTeam: "ARI",
        ogbaTeamId: 1,
        ogbaTeamName: "Skunk Dogs",
        status: "Owned by Skunk Dogs",
        isPitcher: true,
        G_DH: 0,
        G_C: 0,
        G_1B: 0,
        G_2B: 0,
        G_3B: 0,
        G_SS: 0,
        G_OF: 0,
        G_SP: 32,
        G_RP: 0,
        G_p: 32,
        IP: 188.2,
        ER: 55,
        H_p: 150,
        BB: 42,
        SO: 210,
        W: 15,
        S: 0,
        ERA: 2.75,
        WHIP: 1.06,
        SHO: 1
      }
    ]
  };
  