import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SeasonStanding } from "@/lib/api";
import { getSeasonStandings } from "@/lib/api";

const SeasonStandings = () => {
  const [data, setData] = useState<SeasonStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getSeasonStandings();
        setData(res.data);
      } catch (e) {
        console.error(e);
        setError("Failed to load season standings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Season Standings (YTD)
        </h1>
        <p className="text-sm text-muted-foreground">
          Cumulative category points across all periods. (For now: equal to
          Period 1.)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Season Standings</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : data.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No season standings data yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-right">#</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Pts</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead className="text-right">HR</TableHead>
                  <TableHead className="text-right">RBI</TableHead>
                  <TableHead className="text-right">SB</TableHead>
                  <TableHead className="text-right">AVG</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">S</TableHead>
                  <TableHead className="text-right">ERA</TableHead>
                  <TableHead className="text-right">WHIP</TableHead>
                  <TableHead className="text-right">K</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.teamId}>
                    <TableCell className="text-right">{row.rank}</TableCell>
                    <TableCell>{row.teamName}</TableCell>
                    <TableCell className="text-right">
                      {row.points}
                    </TableCell>
                    <TableCell className="text-right">{row.R}</TableCell>
                    <TableCell className="text-right">{row.HR}</TableCell>
                    <TableCell className="text-right">{row.RBI}</TableCell>
                    <TableCell className="text-right">{row.SB}</TableCell>
                    <TableCell className="text-right">
                      {row.AVG.toFixed(3)}
                    </TableCell>
                    <TableCell className="text-right">{row.W}</TableCell>
                    <TableCell className="text-right">{row.S}</TableCell>
                    <TableCell className="text-right">
                      {row.ERA.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.WHIP.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">{row.K}</TableCell>
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

export default SeasonStandings;
