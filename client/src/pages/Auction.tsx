// client/src/pages/Auction.tsx

// Static placeholder page for the Auction tab.
// This intentionally does NOT call any APIs yet.

const Auction = () => {
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Auction (Coming Soon)</h1>

      <p className="text-sm text-gray-700">
        The Auction tab will eventually handle live or offline auction drafts
        for the league (players, budgets, rosters, etc.).
      </p>

      <div className="border rounded-md p-3 bg-gray-50 text-sm text-gray-800 space-y-2">
        <p className="font-semibold">Planned features:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Team budgets and remaining dollars</li>
          <li>Real-time bid history and current high bid</li>
          <li>Player queue / nomination list</li>
          <li>Integration with team rosters and scoring</li>
        </ul>
      </div>

      <p className="text-xs text-gray-500">
        For now, this page is just a visual placeholder and doesn&apos;t hit the
        backend API at all.
      </p>
    </div>
  );
};

export default Auction;
