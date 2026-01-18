import { useEffect, useState } from "react";
import { getTeamDetails, TradeAssetType } from "../api";

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

  if (loading) return <div className="p-4 bg-gray-900 rounded">Loading roster...</div>;

  return (
    <div className="bg-gray-900 p-4 rounded border border-gray-700 h-full flex flex-col">
      <h3 className="text-sm font-bold uppercase text-gray-400 mb-2">{label}</h3>
      
      <div className="flex-1 overflow-y-auto mb-4 border border-gray-800 rounded bg-gray-950 p-2 max-h-60">
        {roster.length === 0 && <div className="text-gray-500 text-sm">No players on roster</div>}
        {roster.map(p => {
          const isSelected = selectedPlayerIds.has(p.playerId);
          return (
            <div 
              key={p.id}
              onClick={() => togglePlayer(p.playerId)}
              className={`flex justify-between items-center p-2 rounded cursor-pointer text-sm mb-1 ${
                isSelected ? "bg-blue-900/50 text-blue-200 border border-blue-800" : "hover:bg-gray-800 text-gray-300"
              }`}
            >
              <span>{p.posPrimary} <strong>{p.name}</strong></span>
              <span className="text-gray-500">${p.price}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-4 border-t border-gray-800">
        <label className="block text-xs text-gray-500 uppercase mb-1">
           Budget (Max: ${budget})
        </label>
        <div className="flex items-center space-x-2">
            <span className="text-gray-400 text-sm">$</span>
            <input 
              type="number"
              min="0"
              max={budget}
              className="bg-gray-800 border-gray-700 rounded px-2 py-1 text-white text-sm w-full focus:outline-none focus:border-blue-500"
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
