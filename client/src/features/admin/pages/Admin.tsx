import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import PageHeader from "../../../components/ui/PageHeader";
import AdminLeagueTools from "../components/AdminLeagueTools";
import AdminTasks from "./AdminTasks";
import { ArrowRight, Map, Wrench, GitCommit, Activity, BarChart3 } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"leagues" | "tasks">("tasks");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10">
       <PageHeader
          title="Admin"
          subtitle="Platform-level administration. All leagues, emergency tools, and bulk data operations."
       />

       {/* Quick links */}
       <div className="mt-4 flex items-center gap-3 flex-wrap">
         <Link
           to="/roadmap"
           className="flex items-center gap-1.5 text-xs font-medium text-[var(--lg-accent)] hover:underline px-3 py-1.5 rounded-md bg-[var(--lg-tint)] border border-[var(--lg-border-faint)]"
         >
           <Map className="w-3.5 h-3.5" /> Roadmap <ArrowRight className="w-3 h-3" />
         </Link>
         <Link
           to="/tech"
           className="flex items-center gap-1.5 text-xs font-medium text-[var(--lg-accent)] hover:underline px-3 py-1.5 rounded-md bg-[var(--lg-tint)] border border-[var(--lg-border-faint)]"
         >
           <Wrench className="w-3.5 h-3.5" /> Under the Hood <ArrowRight className="w-3 h-3" />
         </Link>
         <Link
           to="/changelog"
           className="flex items-center gap-1.5 text-xs font-medium text-[var(--lg-accent)] hover:underline px-3 py-1.5 rounded-md bg-[var(--lg-tint)] border border-[var(--lg-border-faint)]"
         >
           <GitCommit className="w-3.5 h-3.5" /> Changelog <ArrowRight className="w-3 h-3" />
         </Link>
         <Link
           to="/status"
           className="flex items-center gap-1.5 text-xs font-medium text-[var(--lg-accent)] hover:underline px-3 py-1.5 rounded-md bg-[var(--lg-tint)] border border-[var(--lg-border-faint)]"
         >
           <Activity className="w-3.5 h-3.5" /> Status <ArrowRight className="w-3 h-3" />
         </Link>
         <Link
           to="/analytics"
           className="flex items-center gap-1.5 text-xs font-medium text-[var(--lg-accent)] hover:underline px-3 py-1.5 rounded-md bg-[var(--lg-tint)] border border-[var(--lg-border-faint)]"
         >
           <BarChart3 className="w-3.5 h-3.5" /> Analytics <ArrowRight className="w-3 h-3" />
         </Link>
       </div>

       {/* Tabs */}
       <div className="mt-6 flex gap-1 border-b border-[var(--lg-border-faint)]">
         {(["tasks", "leagues"] as const).map(t => (
           <button
             key={t}
             onClick={() => setTab(t)}
             className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
               tab === t
                 ? "bg-[var(--lg-tint)] text-[var(--lg-text-heading)] border border-[var(--lg-border-subtle)] border-b-transparent -mb-px"
                 : "text-[var(--lg-text-muted)] hover:text-[var(--lg-text-primary)]"
             }`}
           >
             {t === "tasks" ? "Product Roadmap" : "League Tools"}
           </button>
         ))}
       </div>

       <div className="mt-6">
        {!user?.isAdmin ? (
          <div className="lg-card p-16 text-center text-sm text-[var(--lg-text-muted)]">
            Admin access required.
          </div>
        ) : tab === "tasks" ? (
          <AdminTasks />
        ) : (
          <AdminLeagueTools />
        )}
      </div>
    </div>
  );
}
