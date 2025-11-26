import { useEffect, useState } from "react";
import {
  getCategoryStandings,
  CategoryStandingsResponse,
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

const CategoryStandings = () => {
  const [data, setData] = useState<CategoryStandingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getCategoryStandings();
        setData(res);
      } catch (e) {
        console.error(e);
        setError("Failed to load category standings.");
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

  if (!data) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-center">Category Standings</h1>

      <div className="space-y-6 max-w-5xl mx-auto">
        {data.categories.map((cat) => (
          <Card key={cat.key}>
            <CardHeader>
              <CardTitle>{cat.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-right w-28">Stat</TableHead>
                    <TableHead className="text-right w-28">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cat.rows.map((row) => (
                    <TableRow key={row.teamId}>
                      <TableCell>{row.rank}</TableCell>
                      <TableCell>{row.teamName}</TableCell>
                      <TableCell className="text-right">
                        {["AVG", "ERA", "WHIP"].includes(cat.key)
                          ? row.value.toFixed(3)
                          : row.value}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.points}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CategoryStandings;
