import { useEffect, useState } from "react";
import type { Team, TeamSummaryRow } from "../lib/api";
import { getTeams, getTeamSummary } from "../lib/api";

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [summary, setSummary] = useState<TeamSummaryRow[] | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Load teams
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadingTeams(true);
      setError(null);
      try {
        const data = await getTeams();
        if (!cancelled) {
          setTeams(data);
          if (data.length > 0) {
            setSelectedTeamId(data[0].id);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load teams",
          );
        }
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load summary for selected team
  useEffect(() => {
    if (selectedTeamId == null) return;

    const teamId = selectedTeamId; // now narrowed to number

    let cancelled = false;

    async function loadSummary() {
      setLoadingSummary(true);
      setError(null);
      try {
        const rows = await getTeamSummary(teamId);
        if (!cancelled) setSummary(rows);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load team summary",
          );
        }
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const seasonLabel = "OGBA 2025 · League ID 1";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Teams</h1>
        <p className="mt-1 text-sm text-slate-400">{seasonLabel}</p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Teams grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loadingTeams && teams.length === 0 ? (
          <div className="col-span-full text-sm text-slate-400">
            Loading teams…
          </div>
        ) : (
          teams.map((team) => {
            const active = team.id === selectedTeamId;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setSelectedTeamId(team.id)}
                className={[
                  "flex flex-col rounded-3xl border border-slate-800 bg-slate-900/60 px-5 py-4 text-left shadow-sm transition-transform transition-colors",
                  active
                    ? "ring-2 ring-sky-400/70 border-sky-500/60"
                    : "hover:border-slate-600 hover:bg-slate-900",
                ].join(" ")}
              >
                <div className="mb-4 text-lg font-semibold text-slate-50">
                  {team.name}
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  <div>
                    <span className="font-medium text-slate-300">
                      Owner:&nbsp;
                    </span>
                    {team.owner || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-slate-300">
                      League:&nbsp;
                    </span>
                    {team.leagueId}
                  </div>
                  <div>
                    <span className="font-medium text-slate-300">
                      Season:&nbsp;
                    </span>
                    —
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Season summary */}
      <div className="mt-8">
        <h2 className="mb-3 text-xl font-semibold tracking-tight">
          Season Summary
          {selectedTeamId != null
            ? ` – ${
                teams.find((t) => t.id === selectedTeamId)?.name ?? ""
              }`
            : ""}
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/90">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-300">
                  Period
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-300">
                  Period Pts
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-300">
                  Season Pts
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingSummary && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-center text-slate-400"
                  >
                    Loading summary…
                  </td>
                </tr>
              )}
              {!loadingSummary && (!summary || summary.length === 0) && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-4 text-center text-slate-500"
                  >
                    No summary data yet.
                  </td>
                </tr>
              )}
              {summary?.map((row) => (
                <tr key={row.periodName} className="border-t border-slate-800">
                  <td className="px-4 py-3 text-slate-200">
                    {row.periodName}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-100">
                    {row.periodPoints.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-100">
                    {row.seasonPoints.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
