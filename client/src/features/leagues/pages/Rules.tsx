import React from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { RulesEditor } from "../components/RulesEditor";
import PageHeader from "../../../components/ui/PageHeader";

export default function Rules() {
  const { user } = useAuth();

  const firstLeagueId = Number(user?.memberships?.[0]?.leagueId) || 1;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10">
      <PageHeader title="League Rules" subtitle="View league settings and rules." />
      <RulesEditor leagueId={firstLeagueId} />
    </div>
  );
}
