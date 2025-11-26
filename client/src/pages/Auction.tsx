import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Auction = () => {
  // For now this is all UI shell — we’ll wire sockets + API later.
  const mockLots = [
    {
      id: 1,
      player: "Mookie Betts",
      positions: "2B, OF",
      nominatingTeam: "Dodger Dawgs",
      currentBid: 32,
      highBidder: "Dodger Dawgs",
      timeLeft: "0:45",
      status: "Bidding",
    },
    {
      id: 2,
      player: "Freddie Freeman",
      positions: "1B",
      nominatingTeam: "Diamond Kings",
      currentBid: 27,
      highBidder: "Diamond Kings",
      timeLeft: "Waiting",
      status: "Queued",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Auction Room</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Pause Auction
          </Button>
          <Button variant="outline" size="sm">
            Resume
          </Button>
          <Button size="sm">Start Next Player</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        {/* Left: Active / queued lots */}
        <Card>
          <CardHeader>
            <CardTitle>Lots</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player</TableHead>
                  <TableHead>Pos</TableHead>
                  <TableHead>Nominating Team</TableHead>
                  <TableHead className="text-right">Current Bid</TableHead>
                  <TableHead>High Bidder</TableHead>
                  <TableHead className="text-right">Time Left</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockLots.map((lot) => (
                  <TableRow key={lot.id}>
                    <TableCell>{lot.player}</TableCell>
                    <TableCell>{lot.positions}</TableCell>
                    <TableCell>{lot.nominatingTeam}</TableCell>
                    <TableCell className="text-right">
                      ${lot.currentBid}
                    </TableCell>
                    <TableCell>{lot.highBidder}</TableCell>
                    <TableCell className="text-right">
                      {lot.timeLeft}
                    </TableCell>
                    <TableCell>{lot.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Right: My budget + quick info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Team / Budget</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team</span>
                <span>Dodger Dawgs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Budget Remaining</span>
                <span>$400</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Players Rostered</span>
                <span>0 / 23</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Controls (Coming Soon)</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p>• Bid / +$1 / +$5 controls</p>
              <p>• Timer per player (e.g. 30–60 seconds)</p>
              <p>• Commissioner pause / resume / undo</p>
              <p>• Integrate with team budgets + rosters</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auction;
