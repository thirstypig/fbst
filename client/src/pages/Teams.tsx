import { useEffect, useState } from "react";
import {
  getTeams,
  getTeamSummary,
  TeamListItem,
  TeamSummary,
} from "../lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TeamsPage = () => {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [summary, setSummary] = useState<TeamSummary | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load teams list on mount
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const data = await getTeams();
        setTeams(data);
        if (data.length > 0) {
          setSelectedTeamId(data[0].id);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load teams.");
      } finally {
        setLoadingTeams(false);
      }
    };
    loadTeams();
  }, []);

  // Load team summary whenever selectedTeamId changes
  useEffect(() => {
    const loadSummary = async () => {
      if (selectedTeamId == null) return;
      setLoadingSummary(true);
      setError(null);
      try {
        const data = await getTeamSummary(selectedTeamId);
        setSummary(data);
      } catch (e) {
        console.error(e);
        setError("Failed to load team summary.");
      } finally {
        setLoadingSummary(false);
      }
    };
    loadSummary();
  }, [selectedTeamId]);

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    if (!Number.isNaN(id)) {
      setSelectedTeamId(id);
    }
  };

  if (loadingTeams) {
    return (
      <div className="w-full flex justify-center mt-16 text-muted-foreground">
        Loading teams…
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex justify-center mt-16 text-red-500">
        {error}
      </div>
    );
  }

  if (!summary || selectedTeamId == null) {
    return (
      <div className="w-full flex justify-center mt-16 text-muted-foreground">
        No team selected.
      </div>
    );
  }

  const { team, period, periodStats, seasonStats, currentRoster, droppedPlayers } =
    summary;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header + Team Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="text-3xl font-bold">Team Overview</h1>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Select team:</span>
          <select
            className="border rounded-md px-2 py-1 text-sm bg-background"
            value={selectedTeamId ?? ""}
            onChange={handleTeamChange}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Team Info + Period info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{team.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Owner:</span>{" "}
              {team.owner || "—"}
            </div>
            <div>
              <span className="font-medium">Budget:</span> ${team.budget}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {period ? (
              <>
                <div>
                  <span className="font-medium">Name:</span> {period.name}
                </div>
                <div>
                  <span className="font-medium">Start:</span>{" "}
                  {new Date(period.startDate).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">End:</span>{" "}
                  {new Date(period.endDate).toLocaleDateString()}
                </div>
              </>
            ) : (
              <div className="text-muted-foreground">
                No active period found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Period Stats</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSummary ? (
              <div className="text-muted-foreground text-sm">
                Loading…
              </div>
            ) : periodStats ? (
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>R</TableCell>
                    <TableCell>{periodStats.R}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>HR</TableCell>
                    <TableCell>{periodStats.HR}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>RBI</TableCell>
                    <TableCell>{periodStats.RBI}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>SB</TableCell>
                    <TableCell>{periodStats.SB}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>AVG</TableCell>
                    <TableCell>{periodStats.AVG.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>W</TableCell>
                    <TableCell>{periodStats.W}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>S</TableCell>
                    <TableCell>{periodStats.S}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ERA</TableCell>
                    <TableCell>{periodStats.ERA.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>WHIP</TableCell>
                    <TableCell>{periodStats.WHIP.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>K</TableCell>
                    <TableCell>{periodStats.K}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Games Played</TableCell>
                    <TableCell>{periodStats.gamesPlayed}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-sm">
                No period stats for this team.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Season Stats (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            {seasonStats ? (
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>R</TableCell>
                    <TableCell>{seasonStats.R}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>HR</TableCell>
                    <TableCell>{seasonStats.HR}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>RBI</TableCell>
                    <TableCell>{seasonStats.RBI}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>SB</TableCell>
                    <TableCell>{seasonStats.SB}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>AVG</TableCell>
                    <TableCell>{seasonStats.AVG.toFixed(3)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>W</TableCell>
                    <TableCell>{seasonStats.W}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>S</TableCell>
                    <TableCell>{seasonStats.S}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>ERA</TableCell>
                    <TableCell>{seasonStats.ERA.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>WHIP</TableCell>
                    <TableCell>{seasonStats.WHIP.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>K</TableCell>
                    <TableCell>{seasonStats.K}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Games Played</TableCell>
                    <TableCell>{seasonStats.gamesPlayed}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <div className="text-muted-foreground text-sm">
                No YTD stats for this team yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Roster */}
      <Card>
        <CardHeader>
          <CardTitle>Current Roster</CardTitle>
        </CardHeader>
        <CardContent>
          {currentRoster.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No active players on this roster (yet).
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="w-24">Pos</TableHead>
                  <TableHead className="w-32">Acquired</TableHead>
                  <TableHead className="w-20 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRoster.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.posList || p.posPrimary}</TableCell>
                    <TableCell>
                      {new Date(p.acquiredAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${p.price}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dropped Players */}
      <Card>
        <CardHeader>
          <CardTitle>Dropped Players (Contributions TBD)</CardTitle>
        </CardHeader>
        <CardContent>
          {droppedPlayers.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No dropped players recorded.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="w-24">Pos</TableHead>
                  <TableHead className="w-32">Acquired</TableHead>
                  <TableHead className="w-32">Released</TableHead>
                  <TableHead className="w-20 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {droppedPlayers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.posList || p.posPrimary}</TableCell>
                    <TableCell>
                      {new Date(p.acquiredAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(p.releasedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ${p.price}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamsPage;
