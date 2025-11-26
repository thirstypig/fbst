      {/* Games by Position (mocked for now) */}
      <Card>
        <CardHeader>
          <CardTitle>Games by Position (Period, mock)</CardTitle>
        </CardHeader>
        <CardContent>
          {currentRoster.length === 0 ? (
            <div className="text-muted-foreground text-sm">
              No games data for this roster yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead className="w-12 text-right">C</TableHead>
                  <TableHead className="w-12 text-right">1B</TableHead>
                  <TableHead className="w-12 text-right">2B</TableHead>
                  <TableHead className="w-12 text-right">3B</TableHead>
                  <TableHead className="w-12 text-right">SS</TableHead>
                  <TableHead className="w-12 text-right">OF</TableHead>
                  <TableHead className="w-12 text-right">DH</TableHead>
                  <TableHead className="w-12 text-right">SP</TableHead>
                  <TableHead className="w-12 text-right">RP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRoster.map((p) => {
                  const gp = p.gamesByPos || {};
                  const get = (pos: string) => gp[pos] ?? 0;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell className="text-right">{get("C")}</TableCell>
                      <TableCell className="text-right">{get("1B")}</TableCell>
                      <TableCell className="text-right">{get("2B")}</TableCell>
                      <TableCell className="text-right">{get("3B")}</TableCell>
                      <TableCell className="text-right">{get("SS")}</TableCell>
                      <TableCell className="text-right">{get("OF")}</TableCell>
                      <TableCell className="text-right">{get("DH")}</TableCell>
                      <TableCell className="text-right">{get("SP")}</TableCell>
                      <TableCell className="text-right">{get("RP")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
