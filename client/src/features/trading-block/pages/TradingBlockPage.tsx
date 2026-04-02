import React from "react";
import PageHeader from "../../../components/ui/PageHeader";
import TradingBlockPanel from "../components/TradingBlockPanel";

export default function TradingBlockPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10 space-y-6">
      <PageHeader
        title="Trading Block"
        subtitle="Players available for trade across the league."
      />
      <div className="lg-card p-4 md:p-6">
        <TradingBlockPanel leagueWide />
      </div>
    </div>
  );
}
