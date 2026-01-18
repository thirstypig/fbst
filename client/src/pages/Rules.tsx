import React, { useEffect } from "react";


export default function Rules() {
  useEffect(() => {
    // Load mermaid dynamically
    const initMermaid = async () => {
      if (typeof window !== 'undefined' && !(window as any).mermaid) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
        script.async = true;
        script.onload = () => {
          (window as any).mermaid.initialize({
            startOnLoad: true,
            theme: 'default',
            flowchart: {
              useMaxWidth: false,
              htmlLabels: true,
              curve: 'basis',
            },
          });
          (window as any).mermaid.contentLoaded();
        };
        document.head.appendChild(script);
      } else if ((window as any).mermaid) {
        (window as any).mermaid.contentLoaded();
      }
    };
    initMermaid();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          OGBA League Rules
        </h1>
        <p className="text-gray-400 mt-2">Official Rules & Regulations</p>
      </div>

      {/* League Overview */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">League Overview</h2>
        <div className="space-y-2 text-gray-300">
          <p><strong>Teams:</strong> 8 teams</p>
          <p><strong>Stats Source:</strong> NL stats only</p>
        </div>
      </section>

      {/* Team Roster */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Team Roster</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Pitchers (9)</h3>
            <p className="text-gray-300">9 pitchers per team</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Batters (14)</h3>
            <ul className="text-gray-300 space-y-1">
              <li>• 1B, 2B, 3B, SS</li>
              <li>• 5 OF</li>
              <li>• 2 C</li>
              <li>• 1 Corner Man (CM)</li>
              <li>• 1 Middle Infielder (MI)</li>
              <li>• 1 Designated Hitter (DH)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Scoring Categories */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Scoring Categories</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3">Hitting Stats</h3>
            <ul className="text-gray-300 space-y-1">
              <li>• Runs (R)</li>
              <li>• Home Runs (HR)</li>
              <li>• Runs Batted In (RBI)</li>
              <li>• Stolen Bases (SB)</li>
              <li>• Batting Average (AVG)</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3">Pitching Stats</h3>
            <ul className="text-gray-300 space-y-1">
              <li>• Wins (W)</li>
              <li>• Saves (S)</li>
              <li>• Earned Run Average (ERA)</li>
              <li>• Walks + Hits per Inning (WHIP)</li>
              <li>• Strikeouts (K)</li>
            </ul>
            <p className="text-sm text-yellow-400 mt-3">
              ⚠️ Minimum 50 innings pitched per period required. Pitchers must pitch to win ERA and WHIP categories.
            </p>
          </div>
        </div>
      </section>

      {/* Period Scoring */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Period Scoring</h2>
        <div className="space-y-4 text-gray-300">
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Category Scoring</h3>
            <p>Each category is scored from 8 points (1st place) to 1 point (8th place) based on:</p>
            <ul className="ml-6 mt-2 space-y-1">
              <li>• <strong>Accumulative stats:</strong> R, HR, RBI, SB, W, S, K</li>
              <li>• <strong>Overall averages:</strong> AVG, ERA, WHIP</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Drop/Add Meeting Order</h3>
            <p>Total period points determine pick order for Drop/Add meetings (lowest score picks first).</p>
            <p className="text-sm text-yellow-400 mt-2">
              <strong>Tiebreaker:</strong> Lowest total games played wins the tie.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Season Standing</h3>
            <p>Period scores accumulate throughout the season to determine final standings and payouts.</p>
          </div>
        </div>
      </section>

      {/* Position Eligibility */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Position Eligibility</h2>
        <div className="space-y-3 text-gray-300">
          <p>• <strong>Default eligibility:</strong> Based on 20+ games played at position in prior season</p>
          <p>• <strong>DH eligibility:</strong> Must have played 10+ games as DH</p>
          <p>• <strong>Acquiring eligibility:</strong> Player gains eligibility after 1 game at new position</p>
          <p>• <strong>Moving eligibility:</strong> Requires 3 games played at the new position</p>
          <div className="bg-blue-900/30 border border-blue-500 rounded p-3 mt-4">
            <p className="font-semibold text-blue-300">⚾ Ohtani Rule</p>
            <p className="text-sm">Shohei Ohtani counts as two separate players: one as a hitter and one as a pitcher.</p>
          </div>
        </div>
      </section>

      {/* Auction Draft */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Auction Draft</h2>
        <div className="space-y-3 text-gray-300">
          <p>• <strong>Budget:</strong> $400 per team</p>
          <p>• <strong>Minimum bid:</strong> $1 per player</p>
          <p>• <strong>Keepers:</strong> 4 players per team (must be announced by deadline)</p>
          <p>• <strong>Nomination order:</strong> Teams nominate players in a specific rotation</p>
          <p>• <strong>Player pool:</strong> All eligible players may be drafted</p>
        </div>
      </section>

      {/* Drop/Add Meetings */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Drop/Add Meetings</h2>
        <div className="space-y-2 text-gray-300">
          <p>• <strong>Player eligibility:</strong> Must have played at least 1 game with stats before the meeting</p>
          <p>• <strong>Pick order:</strong> Determined by previous period's total score (lowest picks first)</p>
        </div>
      </section>

      {/* Injured List */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Injured List (IL)</h2>
        <div className="space-y-2 text-gray-300">
          <p>• <strong>1st IL slot:</strong> $10 per period</p>
          <p>• <strong>2nd IL slot:</strong> $15 per period</p>
        </div>
      </section>

      {/* Trade Flow */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Trade System Flow</h2>
        <p className="text-gray-300 mb-6">
          The following diagram illustrates the complete trade approval process from proposal to execution.
        </p>
        
        <div className="bg-white rounded-lg p-6 mb-4 overflow-auto">
          <pre className="mermaid">
{`graph TB
  Start([Team A Proposes Trade]) --> Pending["Status: PENDING"]
  Pending --> Partner{Team B Response}
  
  Partner -->|Reject| Rejected["Status: REJECTED"]
  Partner -->|Accept| Accepted["Status: ACCEPTED<br/>In Review"]
  Pending -->|Proposer Cancels| Cancelled["Status: CANCELLED"]
  
  Accepted --> ReviewPolicy{"League<br/>Review Policy?"}
  
  ReviewPolicy -->|COMMISSIONER| CommishDecision{"Commissioner<br/>Decision"}
  ReviewPolicy -->|LEAGUE_VOTE| VoteProcess["League Members Vote"]
  
  VoteProcess --> VoteCheck{"Veto Threshold<br/>Reached?"}
  VoteCheck -->|"Yes (>= 4 Vetos)"| Vetoed["Status: VETOED"]
  VoteCheck -->|No| CommishDecision
  
  CommishDecision -->|Veto| Vetoed
  CommishDecision -->|Process| Execute["Execute Trade"]
  
  Execute --> MoveAssets["Move Players<br/>Transfer Budget"]
  MoveAssets --> Processed["Status: PROCESSED"]
  
  Rejected:::rejected
  Cancelled:::cancelled
  Vetoed:::vetoed
  Pending:::pending
  Accepted:::accepted
  Processed:::processed
  
  classDef pending fill:#fef3c7,stroke:#92400e,stroke-width:2px,color:#92400e
  classDef accepted fill:#dbeafe,stroke:#1e40af,stroke-width:2px,color:#1e40af
  classDef processed fill:#d1fae5,stroke:#065f46,stroke-width:2px,color:#065f46
  classDef rejected fill:#fee2e2,stroke:#991b1b,stroke-width:2px,color:#991b1b
  classDef vetoed fill:#fecaca,stroke:#7f1d1d,stroke-width:2px,color:#7f1d1d
  classDef cancelled fill:#e5e7eb,stroke:#374151,stroke-width:2px,color:#374151`}
          </pre>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="bg-gray-900/50 rounded p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Tradeable Assets</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• <strong>Players:</strong> Any rostered player</li>
              <li>• <strong>FAAB Budget:</strong> Cash considerations</li>
              <li>• <strong>Add Picks:</strong> Next Drop/Add priority</li>
              <li>• <strong>Auction $:</strong> Next season budget</li>
            </ul>
          </div>
          <div className="bg-gray-900/50 rounded p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Trade Validation</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Asset ownership verification</li>
              <li>• Budget limit checks</li>
              <li>• Roster size constraints (40-player max)</li>
              <li>• N-for-N balance (allows 2-for-2, 3-for-3)</li>
            </ul>
          </div>
          <div className="bg-gray-900/50 rounded p-4">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">Approval Methods</h3>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Commissioner-only (default)</li>
              <li>• League-wide voting (if enabled)</li>
              <li>• Veto threshold: 4 votes (configurable)</li>
              <li>• Commissioner can always override</li>
            </ul>
          </div>
        </div>
        <div className="bg-blue-900/30 border border-blue-500 rounded p-4 mt-4">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">💡 Trade Examples</h3>
          <ul className="text-gray-300 text-sm space-y-2">
            <li>• Player X → Player Y + $20 FAAB</li>
            <li>• Player X + 1st Add Pick → Player Y + Player Z</li>
            <li>• Player X + $50 Auction $ → Player Y</li>
          </ul>
        </div>
      </section>

      {/* Bonuses */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Bonuses</h2>
        <p className="text-sm text-yellow-400 mb-4">All bonuses must be reported every period to be eligible for payout. Bonuses are paid to the team owner from each team.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3">In-Season Bonuses</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• <strong>Grand Slam HR:</strong> $1</li>
              <li>• <strong>Shutout:</strong> $1</li>
              <li>• <strong>Cycle:</strong> $5</li>
              <li>• <strong>No Hitter:</strong> $5</li>
              <li>• <strong>Perfect Game:</strong> $5</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3">Year-End Awards</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• <strong>MVP:</strong> $5</li>
              <li>• <strong>Cy Young:</strong> $5</li>
              <li>• <strong>Rookie of the Year:</strong> $5</li>
              <li>• <strong>All-Star Game MVP:</strong> $5</li>
              <li>• <strong>Home Run Derby Winner:</strong> $5</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Fees & Payouts */}
      <section className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">Fees & Payouts</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3">League Fees</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• <strong>Team entry fee:</strong> $300</li>
              <li>• <strong>Site fees:</strong> $145</li>
              <li>• <strong>Admin fees:</strong> $120</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-3">Season Payouts</h3>
            <ul className="space-y-1 text-gray-300">
              <li>• <strong>1st Place:</strong> 40%</li>
              <li>• <strong>2nd Place:</strong> 25%</li>
              <li>• <strong>3rd Place:</strong> 15%</li>
              <li>• <strong>4th Place:</strong> 8%</li>
              <li>• <strong>5th Place:</strong> 6%</li>
              <li>• <strong>6th Place:</strong> 4%</li>
              <li>• <strong>7th Place:</strong> 1%</li>
              <li>• <strong>8th Place:</strong> 1%</li>
            </ul>
          </div>
        </div>
      </section>


      <div className="text-center text-gray-500 text-sm py-4">
        Last updated: January 2026
      </div>
    </div>
  );
}
