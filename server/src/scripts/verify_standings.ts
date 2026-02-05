
import { computeCategoryRows, computeStandingsFromStats } from "../services/standingsService.js";

// Mock Data
const mockStats = [
  { team: { id: 1, name: "Team A" }, R: 10, ERA: 3.00 },
  { team: { id: 2, name: "Team B" }, R: 20, ERA: 4.00 }, // Better R, Worse ERA
  { team: { id: 3, name: "Team C" }, R: 10, ERA: 2.00 }, // Tied R (w/ A), Best ERA
];

// Test Category Ranking (Higher is Better: R)
console.log("Testing Runs (Higher is Better)...");
const rRows = computeCategoryRows(mockStats, "R", false);
// Expected: Team B (20) -> Rank 1, Team A/C (10) -> Rank 2/3 (Order depends on sort stability currently)
console.log(JSON.stringify(rRows, null, 2));

// Test Category Ranking (Lower is Better: ERA)
console.log("\nTesting ERA (Lower is Better)...");
const eraRows = computeCategoryRows(mockStats, "ERA", true);
// Expected: Team C (2.00) -> Rank 1, Team A (3.00) -> Rank 2, Team B (4.00) -> Rank 3
console.log(JSON.stringify(eraRows, null, 2));

// Test Overall Standings
console.log("\nTesting Overall Standings...");
// Note: computeStandingsFromStats needs input to have ALL categories to avoid crashing if it iterates all config?
// The current implementation iterates CATEGORY_CONFIG. So our mock stats must have all keys or they will be undefined.
// Let's create full mock stats.
const fullMockStats = [
  { team: { id: 1, name: "Team A" }, R: 10, HR: 0, RBI: 0, SB: 0, AVG: 0, W: 0, S: 0, ERA: 3.00, WHIP: 0, K: 0 },
  { team: { id: 2, name: "Team B" }, R: 20, HR: 0, RBI: 0, SB: 0, AVG: 0, W: 0, S: 0, ERA: 4.00, WHIP: 0, K: 0 },
  { team: { id: 3, name: "Team C" }, R: 10, HR: 0, RBI: 0, SB: 0, AVG: 0, W: 0, S: 0, ERA: 2.00, WHIP: 0, K: 0 },
];

const standings = computeStandingsFromStats(fullMockStats);
console.log(JSON.stringify(standings, null, 2));

// Verification Logic
const teamC = standings.find(s => s.teamName === "Team C");
const teamA = standings.find(s => s.teamName === "Team A");
const teamB = standings.find(s => s.teamName === "Team B");

// C: ERA #1 (3 pts), R #3 (tied w/ A, currently implementation gives 1 or 2 pts depending on sort).
// Current implementation: N=3. Rank 1=3pts, 2=2pts, 3=1pt.
// ERA: C(3), A(2), B(1).
// R: B(3), A(2), C(1) OR A(1), C(2) - Random tie break.

console.log("\n--- Verification Report ---");
if (teamC && teamA && teamB) {
    console.log(`Team C Points: ${teamC.points}`);
    console.log(`Team A Points: ${teamA.points}`);
    console.log(`Team B Points: ${teamB.points}`);
} else {
    console.error("Failed to find teams in standings output.");
}
