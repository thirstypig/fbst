import { useEffect, useState } from "react";
import {
  getCurrentPeriodStandings,
  PeriodStanding,
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

const Standings = () => {
  const [rows, setRows] = useState<PeriodStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCurrentPeriodStandings();
        setRows(res.data);
      } catch (e) {
        console.error(e);
        setError("Failed to load standings.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex justify-center mt-16 text-muted-foreground">
        Loading…
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

  return (
    <Card className="max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">
          Period Standings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right w-24">Points</TableHead>
              <TableHead className="text-center w-16">Δ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.teamId}>
                <TableCell>{row.rank}</TableCell>
                <TableCell>{row.teamName}</TableCell>
                <TableCell className="text-right">
                  {row.points}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {row.delta === 0
                    ? "—"
                    : row.delta > 0
                    ? `+${row.delta}`
                    : row.delta}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Standings;
