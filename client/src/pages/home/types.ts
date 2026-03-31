/** Power ranking entry in the new digest format. */
export interface PowerRanking {
  rank: number;
  teamName: string;
  movement: string;
  commentary: string;
}

/** Category mover entry. */
export interface CategoryMover {
  category: string;
  team: string;
  direction: string;
  detail: string;
}

/** Proposed trade in the digest. */
export interface ProposedTrade {
  style: string;
  title: string;
  description: string;
  teamA: string;
  teamAGives: string;
  teamB: string;
  teamBGives: string;
  reasoning: string;
}

/** Team grade entry (old digest format). */
export interface TeamGrade {
  teamName: string;
  grade: string;
  trend: string;
}

/** Hot/cold team spotlight. */
export interface TeamSpotlight {
  name: string;
  reason: string;
}

/** Vote results for Trade of the Week. */
export interface VoteResults {
  yes: number;
  no: number;
  myVote: string | null;
}

/**
 * League digest API response.
 * Supports both the new 7-section format (powerRankings) and the
 * legacy format (overview + teamGrades) for backward compatibility.
 */
export interface DigestResponse {
  // New format (7-section)
  weekInOneSentence?: string;
  powerRankings?: PowerRanking[];
  hotTeam?: TeamSpotlight;
  coldTeam?: TeamSpotlight;
  statOfTheWeek?: string;
  categoryMovers?: CategoryMover[];
  proposedTrade?: ProposedTrade;
  boldPrediction?: string;

  // Old format (backward compat)
  overview?: string;
  teamGrades?: TeamGrade[];

  // Metadata (added by API response)
  generatedAt?: string;
  weekKey?: string;
  isCurrentWeek?: boolean;
  voteResults?: VoteResults;
}
