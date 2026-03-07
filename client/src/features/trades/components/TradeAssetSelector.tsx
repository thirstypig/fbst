import { useEffect, useState } from "react";
import { getTeamDetails } from "../../../api";
import { TradeAssetType } from "../api";

type Asset = {
  assetType: TradeAssetType;
  playerId?: number;
  amount?: number;
  label: string; // Helpers for UI
};

interface Props {
  teamId: number;
  label: string;
  onAssetsChange: (assets: Asset[]) => void;
}

export function TradeAssetSelector({ teamId, label, onAssetsChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [roster, setRoster] = useState<any[]>([]);
  const [budget, setBudget] = useState(0);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<number>>(new Set());
  const [budgetAmount, setBudgetAmount] = useState<string>("");

  useEffect(() => {
    if (teamId) fetchRoster();
  }, [teamId]);

  // Reset when team changes
  useEffect(() => {
    setRoster([]);
    setSelectedPlayerIds(new Set());
    setBudgetAmount("");
  }, [teamId]);

  async function fetchRoster() {
    setLoading(true);
    try {
      const res = await getTeamDetails(teamId);
      setRoster(res.currentRoster);
      setBudget(res.team.budget);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // Notify parent whenever selection changes
  useEffect(() => {
    const assets: Asset[] = [];
    
    // Players
    selectedPlayerIds.forEach(pid => {
      const p = roster.find(r => r.playerId === pid);
      if (p) {
        assets.push({
          assetType: "PLAYER",
          playerId: pid,
          label: `${p.posPrimary} ${p.name} ($${p.price})`
        });
      }
    });

    // Budget
    const bAmt = parseInt(budgetAmount || "0", 10);
    if (bAmt > 0) {
      assets.push({
        assetType: "BUDGET",
        amount: bAmt,
        label: `$${bAmt} FAAB`
      });
    }

    onAssetsChange(assets);
  }, [selectedPlayerIds, budgetAmount, roster]);

  const togglePlayer = (pid: number) => {
    const next = new Set(selectedPlayerIds);
    if (next.has(pid)) next.delete(pid);
    else next.add(pid);
    setSelectedPlayerIds(next);
  };

  if (loading) return <div className="p-4 bg-[var(--lg-tint)] rounded">Loading roster...</div>;

  return (
    <div className="bg-[var(--lg-tint)] p-4 rounded border border-[var(--lg-border-subtle)] h-full flex flex-col">
      <h3 className="text-sm font-bold uppercase text-[var(--lg-text-muted)] mb-2">{label}</h3>

      <div className="flex-1 overflow-y-auto mb-4 border border-[var(--lg-border-faint)] rounded bg-[var(--lg-input-bg)] p-2 max-h-60">
        {roster.length === 0 && <div className="text-[var(--lg-text-muted)] text-sm">No players on roster</div>}
        {roster.map(p => {
          const isSelected = selectedPlayerIds.has(p.playerId);
          return (
            <div 
              key={p.id}
              onClick={() => togglePlayer(p.playerId)}
              className={`flex justify-between items-center p-2 rounded cursor-pointer text-sm mb-1 ${
                isSelected ? "bg-[var(--lg-accent)]/10 text-[var(--lg-accent)] border border-[var(--lg-accent)]/20" : "hover:bg-[var(--lg-tint-hover)] text-[var(--lg-text-secondary)]"
              }`}
            >
              <span>{p.posPrimary} <strong>{p.name}</strong></span>
              <span className="text-[var(--lg-text-muted)]">${p.price}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-[var(--lg-border-faint)]">
        <label className="block text-xs text-[var(--lg-text-muted)] uppercase mb-1">
           Budget (Max: ${budget})
        </label>
        <div className="flex items-center space-x-2">
            <span className="text-[var(--lg-text-muted)] text-sm">$</span>
            <input
              type="number"
              min="0"
              max={budget}
              className="bg-[var(--lg-tint-hover)] border-[var(--lg-border-subtle)] rounded px-2 py-1 text-[var(--lg-text-primary)] text-sm w-full focus:outline-none focus:border-blue-500"
              placeholder="0"
              value={budgetAmount}
              onChange={e => {
                  const val = Math.min(Number(e.target.value), budget); // simple clamp
                  setBudgetAmount(val > 0 ? String(val) : "");
              }}
            />
        </div>
      </div>
    </div>
  );
}
