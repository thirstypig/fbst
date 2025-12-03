// client/src/pages/Team.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTeamSummary, type TeamSummaryResponse } from "../lib/api";

type ViewState = "idle" | "loading" | "loaded" | "error";

function StatItem({ label, value }: { label: string; value: number | string }) {
  return (
    <>
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}

const TeamPage = () => {
  const { teamId } = useParams<{ teamId: string }>();

  const [state, setState] = useState<ViewState>("idle");
  const [data, setData] = useState<TeamSummaryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;

    setState("loading");
    setError(null);

    getTeamSummary(Number(teamId))
      .then((res) => {
        setData(res);
        setState("loaded");
      })
      .catch((err) => {
        console.error("Error loading team summary", err);
        setError(err.message || "Failed to load team");
        setState("error");
      });
  }, [teamId]);

  if (!teamId) {
    return <div className="p-4 text-sm">No team specified.</div>;
  }

  if (state === "loading" || state === "idle") {
    return <div className="p-4 text-sm">Loading team…</div>;
  }

  if (state === "error") {
    return (
      <div className="p-4">
        <p className="mb-2 text-sm text-red-600">Error: {error}</p>
        <Link
          to="/teams"
          className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-gray-100"
        >
          ← Back to teams
        </Link>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { team, period, periodStats, seasonStats, currentRoster, droppedPlayers } =
    data;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-sm text-gray-600">
            Owner: {team.owner || "—"} · Budget: ${team.budget}
          </p>
          {period && (
            <p className="mt-1 text-xs text-gray-400">
              Active period: {period.name} (
              {new Date(period.startDate).toLocaleDateString()} –{" "}
              {new Date(period.endDate).toLocaleDateString()})
            </p>
          )}
        </div>
        <Link
          to="/teams"
          className="inline-flex items-center rounded-md border px-3 py-1 text-sm hover:bg-gray-100"
        >
          ← Back to teams
        </Link>
      </div>

      {/* Stat blocks */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Period totals
          </h2>
          {periodStats ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <StatItem label="R" value={periodStats.R} />
              <StatItem label="HR" value={periodStats.HR} />
              <StatItem label="RBI" value={periodStats.RBI} />
              <StatItem label="SB" value={periodStats.SB} />
              <StatItem label="AVG" value={periodStats.AVG.toFixed(3)} />
              <StatItem label="W" value={periodStats.W} />
              <StatItem label="S" value={periodStats.S} />
              <StatItem label="ERA" value={periodStats.ERA.toFixed(2)} />
              <StatItem label="WHIP" value={periodStats.WHIP.toFixed(2)} />
              <StatItem label="K" value={periodStats.K} />
              <StatItem label="Games" value={periodStats.gamesPlayed} />
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No period stats yet.</p>
          )}
        </div>

        <div className="rounded-lg border bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Season totals
          </h2>
          {seasonStats ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <StatItem label="R" value={seasonStats.R} />
              <StatItem label="HR" value={seasonStats.HR} />
              <StatItem label="RBI" value={seasonStats.RBI} />
              <StatItem label="SB" value={seasonStats.SB} />
              <StatItem label="AVG" value={seasonStats.AVG.toFixed(3)} />
              <StatItem label="W" value={seasonStats.W} />
              <StatItem label="S" value={seasonStats.S} />
              <StatItem label="ERA" value={seasonStats.ERA.toFixed(2)} />
              <StatItem label="WHIP" value={seasonStats.WHIP.toFixed(2)} />
              <StatItem label="K" value={seasonStats.K} />
              <StatItem label="Games" value={seasonStats.gamesPlayed} />
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No season stats yet.</p>
          )}
        </div>
      </div>

      {/* Current roster */}
      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Current roster ({currentRoster.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Player
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Pos
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Pos list
                </th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">
                  Price
                </th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">
                  Acquired
                </th>
              </tr>
            </thead>
            <tbody>
              {currentRoster.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-gray-500"
                  >
                    No players on roster yet.
                  </td>
                </tr>
              ) : (
                currentRoster.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2">{p.posPrimary}</td>
                    <td className="px-3 py-2">{p.posList}</td>
                    <td className="px-3 py-2 text-right">${p.price}</td>
                    <td className="px-3 py-2">
                      {new Date(p.acquiredAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dropped players */}
      {droppedPlayers.length > 0 && (
        <section className="overflow-hidden rounded-lg border bg-white">
          <div className="border-b px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Dropped players ({droppedPlayers.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Player
                  </th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">
                    Price
                  </th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">
                    Released
                  </th>
                </tr>
              </thead>
              <tbody>
                {droppedPlayers.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right">${p.price}</td>
                    <td className="px-3 py-2">
                      {new Date(p.releasedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default TeamPage;
