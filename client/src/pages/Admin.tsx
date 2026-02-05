// client/src/pages/Admin.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getMe } from "../api";

import PageHeader from "../components/ui/PageHeader";

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await getMe();
        if (!mounted) return;
        setMe(resp.user);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message ?? "Failed to load /auth/me.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--fbst-surface-primary)]">
       <PageHeader 
          title="Admin" 
          subtitle="Platform-level administration (not league commissioner tools)."
       />
       
       <div className="px-10 py-8 mx-auto max-w-4xl w-full">
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-red-300">
            {error}
          </div>
        ) : !me ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/70">
            You are not logged in.
          </div>
        ) : !me.isAdmin ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/70">
            Admin access required.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-lg font-semibold text-white">What “Admin” should own</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
                <li>Global user controls (ban/disable, admin flag).</li>
                <li>League creation (already available in Leagues UI) + emergency repair tools.</li>
                <li>Operational tools: logs, data refresh triggers, background job controls.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm text-white/70">
                For now, do league setup in{" "}
                <Link to="/leagues" className="text-white underline underline-offset-4">
                  Leagues
                </Link>
                .
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
