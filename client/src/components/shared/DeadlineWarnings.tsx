import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, X, AlertTriangle, CalendarClock, Trophy } from "lucide-react";
import { useLeague } from "../../contexts/LeagueContext";
import { getPeriods, type PeriodInfo } from "../../features/periods/api";
import { useCountdownSeconds, formatCountdown } from "../../lib/timeUtils";

// ─── Types ───────────────────────────────────────────────────────────

interface Deadline {
  id: string;
  label: string;
  targetMs: number;
  urgency: "info" | "warning" | "critical";
  link?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const HOURS_72 = 72 * 60 * 60 * 1000;
const HOURS_48 = 48 * 60 * 60 * 1000;
const HOURS_24 = 24 * 60 * 60 * 1000;

function computeUrgency(diffMs: number): "info" | "warning" | "critical" {
  if (diffMs < HOURS_24) return "critical";
  if (diffMs < HOURS_48) return "warning";
  return "info";
}

const DISMISS_KEY = "fbst-deadline-dismissed";

function getDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
  } catch {
    return {};
  }
}

function setDismissed(id: string) {
  const current = getDismissed();
  current[id] = Date.now();
  localStorage.setItem(DISMISS_KEY, JSON.stringify(current));
}

/** Clean stale dismissals older than 7 days */
function cleanDismissals() {
  const current = getDismissed();
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const cleaned: Record<string, number> = {};
  for (const [k, v] of Object.entries(current)) {
    if (v > cutoff) cleaned[k] = v;
  }
  localStorage.setItem(DISMISS_KEY, JSON.stringify(cleaned));
}

// ─── Urgency styles ──────────────────────────────────────────────────

const urgencyStyles: Record<string, string> = {
  info: "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  warning: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  critical: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
};

const urgencyIconColor: Record<string, string> = {
  info: "text-blue-500",
  warning: "text-amber-500",
  critical: "text-red-500",
};

// ─── Single Deadline Pill ────────────────────────────────────────────

function DeadlinePill({
  deadline,
  onDismiss,
}: {
  deadline: Deadline;
  onDismiss: (id: string) => void;
}) {
  // Live countdown
  const seconds = useCountdownSeconds(deadline.targetMs);
  const navigate = useNavigate();

  const countdownText = useMemo(() => {
    if (seconds <= 0) return "Now";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h >= 24) {
      const d = Math.floor(h / 24);
      const rh = h % 24;
      return `${d}d ${rh}h`;
    }
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [seconds]);

  // Re-evaluate urgency live as time passes
  const liveUrgency = useMemo(() => {
    const diffMs = seconds * 1000;
    return computeUrgency(diffMs);
  }, [seconds]);

  const handleClick = useCallback(() => {
    if (deadline.link) navigate(deadline.link);
  }, [deadline.link, navigate]);

  const Icon = liveUrgency === "critical" ? AlertTriangle : Clock;

  return (
    <button
      onClick={handleClick}
      className={`
        group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold
        transition-all duration-200 cursor-pointer hover:scale-[1.02]
        ${urgencyStyles[liveUrgency]}
        ${liveUrgency === "critical" ? "animate-pulse" : ""}
      `}
    >
      <Icon size={13} className={urgencyIconColor[liveUrgency]} />
      <span>{deadline.label}</span>
      <span className="opacity-70 font-mono tabular-nums">{countdownText}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(deadline.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            onDismiss(deadline.id);
          }
        }}
        className="ml-1 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
        aria-label={`Dismiss ${deadline.label}`}
      >
        <X size={12} />
      </span>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export default function DeadlineWarnings() {
  const { leagueId, seasonStatus } = useLeague();
  const [periods, setPeriods] = useState<PeriodInfo[]>([]);
  const [dismissed, setDismissedState] = useState<Record<string, number>>(getDismissed);
  const [loaded, setLoaded] = useState(false);

  // Clean stale dismissals on mount
  useEffect(() => cleanDismissals(), []);

  // Fetch periods
  useEffect(() => {
    if (seasonStatus !== "IN_SEASON" || !leagueId) return;
    let canceled = false;
    getPeriods(leagueId)
      .then((p) => {
        if (!canceled) {
          setPeriods(p);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!canceled) setLoaded(true);
      });
    return () => { canceled = true; };
  }, [leagueId, seasonStatus]);

  // Compute deadlines
  const deadlines = useMemo<Deadline[]>(() => {
    if (seasonStatus !== "IN_SEASON") return [];
    const now = Date.now();
    const result: Deadline[] = [];

    // 1) Active period end date
    const activePeriod = periods.find((p) => p.status === "active");
    if (activePeriod?.endDate) {
      const endMs = new Date(activePeriod.endDate).getTime();
      const diff = endMs - now;
      if (diff > 0 && diff < HOURS_72) {
        result.push({
          id: `period-end-${activePeriod.id}`,
          label: `${activePeriod.name} Ends`,
          targetMs: endMs,
          urgency: computeUrgency(diff),
          link: "/season",
        });
      }
    }

    // 2) Next pending period start (if within 72h — upcoming period transition)
    const nextPending = periods
      .filter((p) => p.status === "pending")
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
    if (nextPending?.startDate) {
      const startMs = new Date(nextPending.startDate).getTime();
      const diff = startMs - now;
      if (diff > 0 && diff < HOURS_72) {
        result.push({
          id: `period-start-${nextPending.id}`,
          label: `${nextPending.name} Starts`,
          targetMs: startMs,
          urgency: computeUrgency(diff),
          link: "/season",
        });
      }
    }

    // 3) Season ends — last period's end date
    const allSorted = [...periods]
      .filter((p) => p.endDate)
      .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    const lastPeriod = allSorted[0];
    if (lastPeriod?.endDate) {
      const seasonEndMs = new Date(lastPeriod.endDate).getTime();
      const diff = seasonEndMs - now;
      // Show "Season Ends" if within 14 days and it's different from the active period end
      if (diff > 0 && diff < 14 * 24 * 60 * 60 * 1000 && lastPeriod.id !== activePeriod?.id) {
        const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
        result.push({
          id: `season-end-${lastPeriod.id}`,
          label: `Season Ends in ${days}d`,
          targetMs: seasonEndMs,
          urgency: diff < HOURS_72 ? computeUrgency(diff) : "info",
          link: "/season",
        });
      }
    }

    return result;
  }, [periods, seasonStatus]);

  // Filter out dismissed
  const visibleDeadlines = useMemo(
    () => deadlines.filter((d) => !dismissed[d.id]),
    [deadlines, dismissed],
  );

  const handleDismiss = useCallback((id: string) => {
    setDismissed(id);
    setDismissedState((prev) => ({ ...prev, [id]: Date.now() }));
  }, []);

  // Nothing to show
  if (seasonStatus !== "IN_SEASON" || !loaded || visibleDeadlines.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleDeadlines.map((d) => (
        <DeadlinePill key={d.id} deadline={d} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
