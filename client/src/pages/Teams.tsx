// client/src/pages/Teams.tsx
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

type Team = {
  id: number;
  name: string;
  owner: string | null;
  budget: number;
  leagueId: number;
};

type PeriodSummary = {
  periodId: number;
  label: string;
  periodPoints: number | null | undefined;
  seasonPoints: number | null | undefined;
};

type TeamSummaryResponse = {
  team: Team;
  periodSummaries: PeriodSummary[];
  seasonTotal: number;
  [key: string]: any;
};

const TeamsPage = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [summary, setSummary] = useState<TeamSummaryResponse | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Load teams list
  useEffect(() => {
    const loadTeams = async () => {
      setLoadingTeams(true);
      setTeamsError(null);

      try {
        const res = await fetch(`${API_BASE}/api/teams`);

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
          throw new Error("Expected array of teams");
        }

        setTeams(data);
        if (data.length > 0) {
          setSelectedTeamId(data[0].id);
        }
      } catch (err) {
        console.error("Failed to load teams:", err);
        setTeamsError("Failed to load teams");
        setTeams([]);
        setSelectedTeamId(null);
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeams();
  }, []);

  // Load summary for selected team
  useEffect(() => {
    if (!selectedTeamId) return;

    const loadSummary = async () => {
      setLoadingSummary(true);
      setSummaryError(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/teams/${selectedTeamId}/summary`
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = (await res.json()) as TeamSummaryResponse;
        setSummary(data);
      } catch (err) {
        console.error("Failed to load team summary:", err);
        setSummaryError("Failed to load team summary");
        setSummary(null);
      } finally {
        setLoadingSummary(false);
      }
    };

    loadSummary();
  }, [selectedTeamId]);

  const handleSelectTeam = (id: number) => {
    setSelectedTeamId(id);
  };

  return (
    <>
      {/* This content is rendered inside Layout's <main>, so no extra sidebar here */}

      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          OGBA 2026 – Fantasy Baseball Stat Tool
        </h1>
      </header>

      {/* Errors */}
      {teamsError && (
        <div className="mb-4 text-red-400 text-sm bg-red-950/40 border border-red-700 px-3 py-2 rounded">
          {teamsError}
        </div>
      )}
      {summaryError && (
        <div className="mb-4 text-red-400 text-sm bg-red-950/40 border border-red-700 px-3 py-2 rounded">
          {summaryError}
        </div>
      )}

      {/* Team buttons */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-3 text-center">Teams</h2>
        {loadingTeams ? (
          <div className="text-sm text-slate-300 text-center">
            Loading teams…
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center">
            {teams.map((team) => {
              const selected = team.id === selectedTeamId;
              return (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  className={`px-4 py-2 rounded-lg border text-sm ${
                    selected
                      ? "bg-blue-500 text-white border-blue-400"
                      : "bg-slate-900 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {team.name}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Season Summary */}
      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3 text-center">
          Season Summary
          {summary?.team ? ` – ${summary.team.name}` : ""}
        </h3>

        {loadingSummary && (
          <div className="text-sm text-slate-300 text-center">
            Loading summary…
          </div>
        )}

        {!loadingSummary && summary && (
          <div className="max-w-3xl mx-auto overflow-x-auto border border-slate-800 rounded-xl">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-slate-900">
                <tr>
                  <th className="border border-slate-800 px-3 py-2 text-left">
                    Period
                  </th>
                  <th className="border border-slate-800 px-3 py-2 text-right">
                    Period Pts
                  </th>
                  <th className="border border-slate-800 px-3 py-2 text-right">
                    Season Pts
                  </th>
                </tr>
              </thead>
              <tbody>
                {(summary.periodSummaries || []).map((p) => {
                  const periodPoints = Number(p.periodPoints ?? 0);
                  const seasonPoints = Number(p.seasonPoints ?? 0);

                  return (
                    <tr key={p.periodId} className="odd:bg-slate-950">
                      <td className="border border-slate-800 px-3 py-2">
                        {p.label}
                      </td>
                      <td className="border border-slate-800 px-3 py-2 text-right">
                        {periodPoints.toFixed(1)}
                      </td>
                      <td className="border border-slate-800 px-3 py-2 text-right">
                        {seasonPoints.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-900 font-semibold">
                  <td className="border border-slate-800 px-3 py-2">
                    Season Total
                  </td>
                  <td className="border border-slate-800 px-3 py-2" />
                  <td className="border border-slate-800 px-3 py-2 text-right">
                    {Number(summary.seasonTotal ?? 0).toFixed(1)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
};

export default TeamsPage;
