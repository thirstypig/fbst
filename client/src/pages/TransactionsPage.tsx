// client/src/pages/TransactionsPage.tsx
import React, { useEffect, useState } from "react";
import { getTransactions, TransactionEvent } from "../api";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const resp = await getTransactions({ take: 100 });
        setTransactions(resp.transactions);
      } catch (err: any) {
        setError(err.message || "Failed to load transactions");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-10 text-slate-400">Loading transactions...</div>;
  if (error) return <div className="p-10 text-red-400">{error}</div>;

  return (
    <div className="px-10 py-8 text-slate-100">
      <h1 className="text-3xl font-semibold">Transaction History</h1>
      <p className="mt-2 text-sm text-slate-400">
        Review recent roster moves and transfers.
      </p>

      <div className="mt-6 overflow-x-auto overflow-y-auto max-h-[70vh] rounded-lg border border-slate-800">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-slate-900 shadow-sm">
            <tr>
              <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Date</th>
              <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Team</th>
              <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Player</th>
              <th className="px-4 py-3 text-left border-b border-slate-700 font-medium text-slate-400">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/40">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-2 whitespace-nowrap text-slate-300">
                  {tx.effDate ? new Date(tx.effDate).toLocaleDateString() : tx.effDateRaw}
                </td>
                <td className="px-4 py-2 text-slate-300 font-medium">
                  {tx.team?.name || tx.ogbaTeamName}
                </td>
                <td className="px-4 py-2 text-slate-300">
                  {tx.player?.name || tx.playerAliasRaw}
                </td>
                <td className="px-4 py-2 text-slate-400 italic">
                  {tx.transactionRaw}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
