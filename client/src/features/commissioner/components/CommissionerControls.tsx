
import React, { useEffect, useState } from 'react';
import { useToast } from "../../../contexts/ToastContext";
import {
    getLeagueRules, saveLeagueRule, type LeagueRule,
    endAuction
} from '../../../api';

interface CommissionerControlsProps {
  leagueId: number;
}

export default function CommissionerControls({ leagueId }: CommissionerControlsProps) {
    const { toast } = useToast();
    const [rules, setRules] = useState<LeagueRule[]>([]);
    const [loading, setLoading] = useState(false);
    const [timerDuration, setTimerDuration] = useState('30');

    const refresh = async () => {
        setLoading(true);
        try {
            const rRes = await getLeagueRules(leagueId);
            setRules(rRes.rules);
            const tRule = rRes.rules.find(r => r.key === 'timer_duration');
            if (tRule) setTimerDuration(tRule.value);
        } catch (e) {
            console.error(e);
            toast('Failed to load settings', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, [leagueId]);

    const handleSaveTimer = async () => {
        try {
            await saveLeagueRule(leagueId, {
                category: 'auction',
                key: 'timer_duration',
                value: timerDuration,
                label: 'Auction Time Limit (sec)'
            });
            toast('Saved timer settings', 'success');
        } catch (e) {
            console.error(e);
            toast('Failed to save rule', 'error');
        }
    };

    const handleEndAuction = async () => {
        if (!confirm('Are you sure you want to END the auction? This will snapshot current rosters for Period 1.')) return;
        try {
            const res = await endAuction(leagueId);
            toast(`Auction Ended. ${res.snapshotted} roster entries archived.`, 'success');
        } catch (e) {
            console.error(e);
            toast('Failed to end auction', 'error');
        }
    };

    return (
        <div className="space-y-6 max-w-xl">
            {/* Auction Settings */}
            <div className="rounded-2xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] p-5">
                <h3 className="text-lg font-semibold text-[var(--lg-text-heading)] mb-4">Auction Settings</h3>

                <div className="bg-[var(--lg-tint)] p-3 rounded-xl space-y-3">
                    <label className="block text-sm text-[var(--lg-text-primary)]">Bid Limit Timer (Seconds)</label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            className="flex-1 bg-[var(--lg-glass-bg)] border border-[var(--lg-border-subtle)] rounded px-2 py-1 text-[var(--lg-text-primary)]"
                            value={timerDuration}
                            onChange={e => setTimerDuration(e.target.value)}
                        />
                        <button
                            onClick={handleSaveTimer}
                            className="px-4 bg-[var(--lg-tint-hover)] hover:bg-[var(--lg-tint-hover)] text-[var(--lg-text-primary)] rounded text-sm"
                        >
                            Save
                        </button>
                    </div>
                    <p className="text-xs text-[var(--lg-text-muted)]">Set to 0 to disable timer for high-value players.</p>
                </div>
            </div>

            {/* End Auction */}
            <div className="rounded-2xl border border-[var(--lg-border-subtle)] bg-[var(--lg-tint)] p-5">
                <h3 className="text-lg font-semibold text-[var(--lg-text-heading)] mb-4">Actions</h3>

                <button
                    onClick={handleEndAuction}
                    className="w-full py-3 bg-red-600/80 hover:bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                    End Auction & Finalize
                </button>
                <p className="mt-2 text-xs text-[var(--lg-text-muted)] text-center">
                    This creates a snapshot of all current rosters as the "Start of Season" state (Period 1).
                </p>
            </div>
        </div>
    );
}
