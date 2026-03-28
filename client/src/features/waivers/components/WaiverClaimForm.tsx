import React, { useState, useMemo } from "react";
import { fetchJsonApi, API_BASE } from "../../../api/base";
import { useLeague } from "../../../contexts/LeagueContext";
import { useToast } from "../../../contexts/ToastContext";
import type { PlayerSeasonStat } from "../../../api";

interface WaiverClaimFormProps {
  players: PlayerSeasonStat[];
  myTeamId: number;
  myTeamBudget: number;
  myRoster: PlayerSeasonStat[];
  onComplete: () => void;
}

export default function WaiverClaimForm({ players, myTeamId, myTeamBudget, myRoster, onComplete }: WaiverClaimFormProps) {
  const { leagueId } = useLeague();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSeasonStat | null>(null);
  const [bidAmount, setBidAmount] = useState(1);
  const [dropPlayerId, setDropPlayerId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filter available players (not on any team)
  const available = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (players || [])
      .filter((p: any) => {
        const teamCode = p.ogba_team_code || p.team || "";
        if (teamCode && teamCode !== "") return false; // already rostered
        const name = (p.player_name || p.name || "").toLowerCase();
        return !q || name.includes(q);
      })
      .slice(0, 20);
  }, [players, search]);

  const handleSubmit = async () => {
    if (!selectedPlayer || !myTeamId || !leagueId) return;
    const playerId = Number((selectedPlayer as any).mlb_id || (selectedPlayer as any)._dbPlayerId);
    if (!playerId) { toast("Cannot identify player", "error"); return; }

    // Look up the internal player ID from the DB
    setSubmitting(true);
    try {
      const result = await fetchJsonApi<{ claim: any }>(`${API_BASE}/waivers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: myTeamId,
          playerId,
          bidAmount,
          dropPlayerId: dropPlayerId || undefined,
          priority: 1,
        }),
      });

      if ((result as any).error) {
        toast((result as any).error, "error");
      } else {
        toast(`Waiver claim submitted for ${(selectedPlayer as any).player_name || "player"} ($${bidAmount})`, "success");
        setSelectedPlayer(null);
        setBidAmount(1);
        setDropPlayerId(null);
        setSearch("");
        onComplete();
      }
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Claim failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="text-xs font-semibold uppercase text-[var(--lg-text-muted)] mb-2">
        Submit Waiver Claim · Waiver Budget: <span className="text-[var(--lg-accent)]">${myTeamBudget}</span>
      </div>

      {/* Step 1: Search for a player to claim */}
      <div>
        <label className="text-[10px] font-semibold uppercase text-[var(--lg-text-muted)] block mb-1">Search Available Players</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type player name..."
          className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--lg-border-subtle)] bg-[var(--lg-bg-secondary)] text-[var(--lg-text-primary)] outline-none focus:border-[var(--lg-accent)] transition-colors"
        />
        {search && !selectedPlayer && (
          <div className="mt-1 rounded-lg border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] max-h-48 overflow-y-auto">
            {available.length === 0 ? (
              <div className="px-3 py-2 text-xs text-[var(--lg-text-muted)]">No available players found</div>
            ) : (
              available.map((p: any, i: number) => (
                <button
                  key={i}
                  onClick={() => { setSelectedPlayer(p); setSearch(""); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--lg-tint-hover)] transition-colors flex items-center justify-between"
                >
                  <span className="font-medium text-[var(--lg-text-primary)]">{p.player_name || p.name}</span>
                  <span className="text-[var(--lg-text-muted)]">{p.positions || p.posPrimary} · {p.mlb_team || p.mlbTeam}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected player display */}
      {selectedPlayer && (
        <div className="rounded-lg border border-[var(--lg-accent)]/30 bg-[var(--lg-accent)]/5 px-3 py-2 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-[var(--lg-text-primary)]">
              {(selectedPlayer as any).player_name || (selectedPlayer as any).name}
            </span>
            <span className="ml-2 text-xs text-[var(--lg-text-muted)]">
              {(selectedPlayer as any).positions || (selectedPlayer as any).posPrimary} · {(selectedPlayer as any).mlb_team || (selectedPlayer as any).mlbTeam}
            </span>
          </div>
          <button onClick={() => setSelectedPlayer(null)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
        </div>
      )}

      {/* Step 2: FAAB Bid Amount */}
      {selectedPlayer && (
        <div>
          <label className="text-[10px] font-semibold uppercase text-[var(--lg-text-muted)] block mb-1">
            Waiver Budget Bid (max ${myTeamBudget})
          </label>
          <input
            type="number"
            min={0}
            max={myTeamBudget}
            value={bidAmount}
            onChange={(e) => setBidAmount(Math.min(myTeamBudget, Math.max(0, Number(e.target.value))))}
            className="w-32 px-3 py-2 text-sm rounded-lg border border-[var(--lg-border-subtle)] bg-[var(--lg-bg-secondary)] text-[var(--lg-text-primary)] outline-none focus:border-[var(--lg-accent)] transition-colors"
          />
        </div>
      )}

      {/* Step 3: Optional drop player */}
      {selectedPlayer && myRoster.length >= 23 && (
        <div>
          <label className="text-[10px] font-semibold uppercase text-[var(--lg-text-muted)] block mb-1">
            Drop Player (required — roster full)
          </label>
          <select
            value={dropPlayerId ?? ""}
            onChange={(e) => setDropPlayerId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--lg-border-subtle)] bg-[var(--lg-bg-secondary)] text-[var(--lg-text-primary)] outline-none focus:border-[var(--lg-accent)] transition-colors"
          >
            <option value="">Select player to drop...</option>
            {myRoster.map((p: any, i: number) => (
              <option key={i} value={(p as any)._dbPlayerId || (p as any).mlb_id}>
                {p.player_name || p.name} ({p.positions || p.posPrimary})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Submit */}
      {selectedPlayer && (
        <button
          onClick={handleSubmit}
          disabled={submitting || bidAmount < 0 || bidAmount > myTeamBudget || (myRoster.length >= 23 && !dropPlayerId)}
          className="px-6 py-2 text-sm font-semibold rounded-lg bg-[var(--lg-accent)] text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {submitting ? "Submitting..." : `Submit Claim ($${bidAmount})`}
        </button>
      )}
    </div>
  );
}
