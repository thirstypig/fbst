import React, { useEffect, useState } from "react";
import { Trophy, Star, Crown, ChevronDown, ChevronUp } from "lucide-react";
import { getPeriodAwards, getPeriods, type PeriodAwards, type PeriodInfo } from "../api";
import { fmt2 } from "../../../api/base";

interface Props {
  leagueId: number;
}

function formatCategoryValue(value: number, category: string, isLowerBetter: boolean): string {
  if (category === "AVG") return value.toFixed(3).replace(/^0/, "");
  if (category === "ERA") return fmt2(value);
  if (category === "WHIP") return fmt2(value);
  return String(Math.round(value));
}

export default function PeriodAwardsCard({ leagueId }: Props) {
  const [awards, setAwards] = useState<PeriodAwards | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  // Fetch periods
  useEffect(() => {
    if (!leagueId) return;
    getPeriods(leagueId)
      .then((data) => {
        setPeriods(data);
        // Default to the most recent completed or active period
        const active = data.find((p) => p.status === "active");
        const completed = [...data].reverse().find((p) => p.status === "completed");
        const target = active ?? completed ?? data[data.length - 1];
        if (target) setSelectedPeriodId(target.id);
      })
      .catch(() => setPeriods([]));
  }, [leagueId]);

  // Fetch awards when period changes
  useEffect(() => {
    if (!leagueId || !selectedPeriodId) return;
    setLoading(true);
    getPeriodAwards(selectedPeriodId, leagueId)
      .then(setAwards)
      .catch(() => setAwards(null))
      .finally(() => setLoading(false));
  }, [leagueId, selectedPeriodId]);

  if (!leagueId || periods.length === 0) return null;

  const hasAnyAward = awards && (awards.managerOfPeriod || awards.pickupOfPeriod || awards.categoryKings.length > 0);

  return (
    <div className="rounded-2xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-[var(--lg-bg-card)]/30 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Trophy size={14} className="text-amber-400 flex-shrink-0" />
          <span className="text-xs font-semibold uppercase text-[var(--lg-text-muted)]">
            Period Awards
          </span>
          {awards?.periodName && (
            <span className="text-[10px] text-[var(--lg-text-muted)] opacity-60">
              {awards.periodName}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp size={14} className="text-[var(--lg-text-muted)]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--lg-text-muted)]" />
        )}
      </button>

      {expanded && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-4">
          {/* Period selector pills */}
          {periods.length > 1 && (
            <div className="overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
              <div className="flex gap-1.5 min-w-max">
                {periods.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPeriodId(p.id)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                      selectedPeriodId === p.id
                        ? "bg-[var(--lg-accent)] text-white"
                        : "bg-[var(--lg-bg-card)] text-[var(--lg-text-muted)] border border-[var(--lg-border-faint)] hover:border-[var(--lg-accent)]/30 hover:text-[var(--lg-text-primary)]"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--lg-text-muted)] animate-pulse">
              <Trophy size={14} className="text-amber-400" />
              Computing awards...
            </div>
          )}

          {!loading && !hasAnyAward && (
            <div className="text-center text-xs text-[var(--lg-text-muted)] py-4">
              No awards data available for this period yet.
            </div>
          )}

          {!loading && hasAnyAward && (
            <div className="space-y-3">
              {/* Manager of Period */}
              {awards.managerOfPeriod && (
                <div className="px-3 py-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy size={13} className="text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-400">
                      Manager of the Period
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--lg-text-primary)]">
                      {awards.managerOfPeriod.teamName}
                    </span>
                    <span className="text-xs font-medium text-[var(--lg-text-secondary)]">
                      {fmt2(awards.managerOfPeriod.totalPoints)} pts
                    </span>
                  </div>
                </div>
              )}

              {/* Pickup of Period */}
              {awards.pickupOfPeriod && (
                <div className="px-3 py-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Star size={13} className="text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                      Pickup of the Period
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold text-[var(--lg-text-primary)]">
                        {awards.pickupOfPeriod.playerName}
                      </span>
                      <span className="text-xs text-[var(--lg-text-muted)] ml-2">
                        ${awards.pickupOfPeriod.claimPrice} by {awards.pickupOfPeriod.teamName}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-[var(--lg-text-secondary)] mt-1">
                    {awards.pickupOfPeriod.statsLine}
                  </div>
                </div>
              )}

              {/* Category Kings */}
              {awards.categoryKings.length > 0 && (
                <div className="px-3 py-2.5 rounded-lg border border-purple-500/20 bg-purple-500/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown size={13} className="text-purple-400" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-purple-400">
                      Category Kings
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1.5">
                    {awards.categoryKings.map((ck) => (
                      <div key={ck.category} className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-medium text-[var(--lg-text-muted)] uppercase">
                          {ck.category}
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--lg-text-primary)] truncate">
                          {ck.teamCode}{" "}
                          <span className="text-[var(--lg-text-secondary)] font-normal">
                            {formatCategoryValue(ck.value, ck.category, ck.isLowerBetter)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
