import React from "react";
import { useAuth } from "../../../auth/AuthProvider";
import { RulesEditor } from "../components/RulesEditor";
import PageHeader from "../../../components/ui/PageHeader";

export default function Rules() {
  const { user } = useAuth();

  const firstLeagueId = Number(user?.memberships?.[0]?.leagueId) || 1;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <PageHeader title="League Rules" subtitle="View league settings and rules." />
      <RulesEditor leagueId={firstLeagueId} />
    </div>
  );
}
