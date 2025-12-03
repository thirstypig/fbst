// client/src/pages/Standings.tsx
import {
  PeriodSummaryTable,
  CategoryPeriodTable,
  CategoryId,
  TeamPeriodSummaryRow,
  CategoryPeriodRow,
} from "@/components/StatsTables";

const periodId = "P1";

// Hitting + pitching categories
const categories: CategoryId[] = [
  "R",
  "HR",
  "RBI",
  "SB",
  "AVG",
  "W",
  "SV",
  "K",
  "ERA",
  "WHIP",
];

// One row per OGBA team – dummy points for now
const periodRows: TeamPeriodSummaryRow[] = [
  {
    teamId: "DodgerDawgs",
    teamName: "Dodger Dawgs",
    gamesPlayed: 12,
    categories: [
      { categoryId: "R", points: 8 },
      { categoryId: "HR", points: 8 },
      { categoryId: "RBI", points: 7 },
      { categoryId: "SB", points: 6 },
      { categoryId: "AVG", points: 8 },
      { categoryId: "W", points: 8 },
      { categoryId: "SV", points: 7 },
      { categoryId: "K", points: 8 },
      { categoryId: "ERA", points: 7 },
      { categoryId: "WHIP", points: 6 },
    ],
    totalPoints: 73,
    totalPointsDelta: 1.5,
  },
  {
    teamId: "DemolitionLumberCo",
    teamName: "Demolition Lumber Co.",
    gamesPlayed: 12,
    categories: [
      { categoryId: "R", points: 7 },
      { categoryId: "HR", points: 7 },
      { categoryId: "RBI", points: 8 },
      { categoryId: "SB", points: 5 },
      { categoryId: "AVG", points: 7 },
      { categoryId: "W", points: 7 },
      { categoryId: "SV", points: 8 },
      { categoryId: "K", points: 7 },
      { categoryId: "ERA", points: 6 },
      { categoryId: "WHIP", points: 7 },
    ],
    totalPoints: 69,
    totalPointsDelta: -0.5,
  },
  {
    teamId: "TheShow",
    teamName: "The Show",
    gamesPlayed: 11,
    categories: [
      { categoryId: "R", points: 6 },
      { categoryId: "HR", points: 6 },
      { categoryId: "RBI", points: 6 },
      { categoryId: "SB", points: 8 },
      { categoryId: "AVG", points: 6 },
      { categoryId: "W", points: 6 },
      { categoryId: "SV", points: 6 },
      { categoryId: "K", points: 6 },
      { categoryId: "ERA", points: 8 },
      { categoryId: "WHIP", points: 8 },
    ],
    totalPoints: 64,
    totalPointsDelta: 0.2,
  },
  {
    teamId: "LosDoyers",
    teamName: "Los Doyers",
    gamesPlayed: 11,
    categories: [
      { categoryId: "R", points: 5 },
      { categoryId: "HR", points: 5 },
      { categoryId: "RBI", points: 5 },
      { categoryId: "SB", points: 7 },
      { categoryId: "AVG", points: 5 },
      { categoryId: "W", points: 5 },
      { categoryId: "SV", points: 5 },
      { categoryId: "K", points: 5 },
      { categoryId: "ERA", points: 5 },
      { categoryId: "WHIP", points: 5 },
    ],
    totalPoints: 52,
    totalPointsDelta: 0,
  },
  {
    teamId: "SkunkDogs",
    teamName: "Skunk Dogs",
    gamesPlayed: 10,
    categories: [
      { categoryId: "R", points: 4 },
      { categoryId: "HR", points: 4 },
      { categoryId: "RBI", points: 4 },
      { categoryId: "SB", points: 4 },
      { categoryId: "AVG", points: 4 },
      { categoryId: "W", points: 4 },
      { categoryId: "SV", points: 4 },
      { categoryId: "K", points: 4 },
      { categoryId: "ERA", points: 4 },
      { categoryId: "WHIP", points: 4 },
    ],
    totalPoints: 40,
    totalPointsDelta: -1,
  },
  {
    teamId: "RGingSluggers",
    teamName: "RGing Sluggers",
    gamesPlayed: 10,
    categories: [
      { categoryId: "R", points: 3 },
      { categoryId: "HR", points: 3 },
      { categoryId: "RBI", points: 3 },
      { categoryId: "SB", points: 3 },
      { categoryId: "AVG", points: 3 },
      { categoryId: "W", points: 3 },
      { categoryId: "SV", points: 3 },
      { categoryId: "K", points: 3 },
      { categoryId: "ERA", points: 3 },
      { categoryId: "WHIP", points: 3 },
    ],
    totalPoints: 30,
    totalPointsDelta: 0.3,
  },
  {
    teamId: "DiamondKings",
    teamName: "Diamond Kings",
    gamesPlayed: 12,
    categories: [
      { categoryId: "R", points: 2 },
      { categoryId: "HR", points: 2 },
      { categoryId: "RBI", points: 2 },
      { categoryId: "SB", points: 2 },
      { categoryId: "AVG", points: 2 },
      { categoryId: "W", points: 2 },
      { categoryId: "SV", points: 2 },
      { categoryId: "K", points: 2 },
      { categoryId: "ERA", points: 2 },
      { categoryId: "WHIP", points: 2 },
    ],
    totalPoints: 20,
    totalPointsDelta: 0,
  },
  {
    teamId: "DevilDawgs",
    teamName: "Devil Dawgs",
    gamesPlayed: 9,
    categories: [
      { categoryId: "R", points: 1 },
      { categoryId: "HR", points: 1 },
      { categoryId: "RBI", points: 1 },
      { categoryId: "SB", points: 1 },
      { categoryId: "AVG", points: 1 },
      { categoryId: "W", points: 1 },
      { categoryId: "SV", points: 1 },
      { categoryId: "K", points: 1 },
      { categoryId: "ERA", points: 1 },
      { categoryId: "WHIP", points: 1 },
    ],
    totalPoints: 10,
    totalPointsDelta: -0.2,
  },
];

// Dummy per-category stats for now
const categoryRows: Record<CategoryId, CategoryPeriodRow[]> = {
  R: [
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 45, points: 8, pointsDelta: 0.5 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 42, points: 7, pointsDelta: 0 },
    { teamId: "TheShow", teamName: "The Show", periodStat: 39, points: 6, pointsDelta: 0.1 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 36, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 33, points: 4, pointsDelta: -0.2 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 30, points: 3, pointsDelta: 0.2 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 28, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 25, points: 1, pointsDelta: -0.1 },
  ],
  // For brevity the rest of the categories reuse the same team IDs/names
  // with slightly different dummy stats.
  HR: [
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 12, points: 8, pointsDelta: 0.3 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 11, points: 7, pointsDelta: 0 },
    { teamId: "TheShow", teamName: "The Show", periodStat: 10, points: 6, pointsDelta: 0.1 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 9, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 7, points: 4, pointsDelta: -0.1 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 6, points: 3, pointsDelta: 0.1 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 4, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 3, points: 1, pointsDelta: 0 },
  ],
  RBI: [
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 40, points: 7, pointsDelta: 0.2 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 42, points: 8, pointsDelta: 0.3 },
    { teamId: "TheShow", teamName: "The Show", periodStat: 38, points: 6, pointsDelta: 0 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 35, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 30, points: 4, pointsDelta: -0.2 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 27, points: 3, pointsDelta: 0.1 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 24, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 20, points: 1, pointsDelta: 0 },
  ],
  SB: [
    { teamId: "TheShow", teamName: "The Show", periodStat: 9, points: 8, pointsDelta: 0.4 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 8, points: 7, pointsDelta: 0.2 },
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 7, points: 6, pointsDelta: 0.1 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 5, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 6, points: 4, pointsDelta: -0.1 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 4, points: 3, pointsDelta: 0 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 3, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 2, points: 1, pointsDelta: 0 },
  ],
  AVG: [
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 0.288, points: 8, pointsDelta: 0.01 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 0.282, points: 7, pointsDelta: -0.002 },
    { teamId: "TheShow", teamName: "The Show", periodStat: 0.278, points: 6, pointsDelta: 0.003 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 0.271, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 0.265, points: 4, pointsDelta: -0.004 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 0.259, points: 3, pointsDelta: 0.002 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 0.251, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 0.244, points: 1, pointsDelta: -0.003 },
  ],
  W: [
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 7, points: 8, pointsDelta: 0.2 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 6, points: 7, pointsDelta: 0 },
    { teamId: "TheShow", teamName: "The Show", periodStat: 5, points: 6, pointsDelta: 0.1 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 4, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 3, points: 4, pointsDelta: -0.1 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 2, points: 3, pointsDelta: 0 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 1, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 0, points: 1, pointsDelta: 0 },
  ],
  SV: [
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 6, points: 8, pointsDelta: 0.3 },
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 5, points: 7, pointsDelta: 0.1 },
    { teamId: "TheShow", teamName: "The Show", periodStat: 4, points: 6, pointsDelta: 0 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 3, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 2, points: 4, pointsDelta: -0.1 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 2, points: 3, pointsDelta: 0 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 1, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 0, points: 1, pointsDelta: 0 },
  ],
  K: [
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 78, points: 8, pointsDelta: 0.4 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 74, points: 7, pointsDelta: 0.1 },
    { teamId: "TheShow", teamName: "The Show", periodStat: 70, points: 6, pointsDelta: 0 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 65, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 60, points: 4, pointsDelta: -0.2 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 55, points: 3, pointsDelta: 0.1 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 50, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 45, points: 1, pointsDelta: 0 },
  ],
  ERA: [
    { teamId: "TheShow", teamName: "The Show", periodStat: 3.10, points: 8, pointsDelta: 0.05 },
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 3.25, points: 7, pointsDelta: 0.03 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 3.40, points: 6, pointsDelta: -0.02 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 3.70, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 3.90, points: 4, pointsDelta: 0 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 4.10, points: 3, pointsDelta: 0 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 4.40, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 4.70, points: 1, pointsDelta: 0 },
  ],
  WHIP: [
    { teamId: "TheShow", teamName: "The Show", periodStat: 1.05, points: 8, pointsDelta: 0.03 },
    { teamId: "DodgerDawgs", teamName: "Dodger Dawgs", periodStat: 1.10, points: 7, pointsDelta: 0.02 },
    { teamId: "DemolitionLumberCo", teamName: "Demolition Lumber Co.", periodStat: 1.15, points: 6, pointsDelta: 0 },
    { teamId: "LosDoyers", teamName: "Los Doyers", periodStat: 1.20, points: 5, pointsDelta: 0 },
    { teamId: "SkunkDogs", teamName: "Skunk Dogs", periodStat: 1.25, points: 4, pointsDelta: -0.01 },
    { teamId: "RGingSluggers", teamName: "RGing Sluggers", periodStat: 1.30, points: 3, pointsDelta: 0 },
    { teamId: "DiamondKings", teamName: "Diamond Kings", periodStat: 1.35, points: 2, pointsDelta: 0 },
    { teamId: "DevilDawgs", teamName: "Devil Dawgs", periodStat: 1.40, points: 1, pointsDelta: 0 },
  ],
};

const Standings = () => {
  return (
    <div className="p-4 space-y-8">
      <h1 className="text-xl font-bold mb-4">Period Standings</h1>

      <PeriodSummaryTable
        periodId={periodId}
        rows={periodRows}
        categories={categories}
      />

      {categories.map((cat) => (
        <CategoryPeriodTable
          key={cat}
          periodId={periodId}
          categoryId={cat}
          rows={categoryRows[cat]}
        />
      ))}
    </div>
  );
};

export default Standings;
