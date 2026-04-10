import { useState, useEffect, useCallback } from "react";
import { fetchJsonApi, API_BASE } from "../../../api/base";
import { ChevronDown, ChevronRight, Plus, Check, Circle, Loader2 } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "not_started" | "in_progress" | "done";
  owner?: string;
  instructions?: string[];
  notes?: string;
  updatedAt?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  tasks: Task[];
}

interface TasksData {
  milestones: Milestone[];
}

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "text-slate-500", bg: "bg-slate-500/10 border-slate-500/20", icon: Circle },
  in_progress: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Loader2 },
  done: { label: "Done", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: Check },
} as const;

const NEXT_STATUS: Record<string, Task["status"]> = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
};

export default function AdminTasks() {
  const [data, setData] = useState<TasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [updating, setUpdating] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const res = await fetchJsonApi<TasksData>(`${API_BASE}/admin/tasks`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (taskId: string) => {
    if (!data) return;
    const task = data.milestones.flatMap(m => m.tasks).find(t => t.id === taskId);
    if (!task) return;

    const newStatus = NEXT_STATUS[task.status];
    setUpdating(prev => new Set(prev).add(taskId));

    try {
      await fetchJsonApi(`${API_BASE}/admin/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      task.status = newStatus;
      setData({ ...data });
    } finally {
      setUpdating(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  };

  const addTask = async (milestoneId: string) => {
    if (!newTitle.trim()) return;
    try {
      await fetchJsonApi(`${API_BASE}/admin/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId, title: newTitle.trim() }),
      });
      setNewTitle("");
      setAddingTo(null);
      load();
    } catch { /* ignore */ }
  };

  if (loading) return <div className="text-[var(--lg-text-muted)] py-12 text-center">Loading tasks...</div>;
  if (!data) return <div className="text-[var(--lg-text-muted)] py-12 text-center">Failed to load tasks.</div>;

  const totalTasks = data.milestones.reduce((s, m) => s + m.tasks.length, 0);
  const doneTasks = data.milestones.reduce((s, m) => s + m.tasks.filter(t => t.status === "done").length, 0);
  const inProgress = data.milestones.reduce((s, m) => s + m.tasks.filter(t => t.status === "in_progress").length, 0);

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--lg-text-heading)]">Product Roadmap</h2>
          <p className="text-xs text-[var(--lg-text-muted)] mt-1">
            {doneTasks}/{totalTasks} done · {inProgress} in progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-48 bg-[var(--lg-tint)] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs font-bold text-[var(--lg-text-muted)]">
            {totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Milestones */}
      {data.milestones.map(milestone => {
        const isCollapsed = collapsed.has(milestone.id);
        const mDone = milestone.tasks.filter(t => t.status === "done").length;
        const mTotal = milestone.tasks.length;

        return (
          <div key={milestone.id} className="bg-[var(--lg-tint)] border border-[var(--lg-border-subtle)] rounded-xl overflow-hidden">
            {/* Milestone header */}
            <button
              onClick={() => setCollapsed(prev => {
                const n = new Set(prev);
                isCollapsed ? n.delete(milestone.id) : n.add(milestone.id);
                return n;
              })}
              className="w-full flex items-center justify-between p-4 hover:bg-[var(--lg-bg-card)] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isCollapsed ? <ChevronRight size={16} className="text-[var(--lg-text-muted)]" /> : <ChevronDown size={16} className="text-[var(--lg-text-muted)]" />}
                <div>
                  <h3 className="text-sm font-bold text-[var(--lg-text-heading)]">{milestone.title}</h3>
                  <p className="text-xs text-[var(--lg-text-muted)] mt-0.5">{milestone.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[var(--lg-text-muted)]">{mDone}/{mTotal}</span>
                <div className="h-1.5 w-20 bg-[var(--lg-bg)] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${mTotal > 0 ? (mDone / mTotal) * 100 : 0}%` }} />
                </div>
              </div>
            </button>

            {/* Tasks */}
            {!isCollapsed && (
              <div className="border-t border-[var(--lg-border-faint)]">
                {milestone.tasks.map(task => {
                  const cfg = STATUS_CONFIG[task.status];
                  const Icon = cfg.icon;
                  const isExpanded = expandedTask === task.id;
                  const isUpdating = updating.has(task.id);

                  return (
                    <div key={task.id} className="border-b border-[var(--lg-border-faint)] last:border-b-0">
                      <div className="flex items-center gap-3 px-4 py-3">
                        {/* Status toggle */}
                        <button
                          onClick={() => toggleStatus(task.id)}
                          disabled={isUpdating}
                          className={`flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${cfg.bg} hover:opacity-80 disabled:opacity-50`}
                          title={`Click to change: ${cfg.label} → ${STATUS_CONFIG[NEXT_STATUS[task.status]].label}`}
                        >
                          <Icon size={14} className={`${cfg.color} ${task.status === "in_progress" ? "animate-spin" : ""}`} />
                        </button>

                        {/* Title + owner */}
                        <button
                          onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                          className={`flex-1 text-left text-sm font-medium transition-colors ${task.status === "done" ? "text-[var(--lg-text-muted)] line-through" : "text-[var(--lg-text-primary)]"}`}
                        >
                          {task.title}
                        </button>

                        {task.owner && (
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            task.owner === "jimmy"
                              ? "text-blue-400 bg-blue-500/10 border-blue-500/20"
                              : "text-purple-400 bg-purple-500/10 border-purple-500/20"
                          }`}>
                            {task.owner}
                          </span>
                        )}
                      </div>

                      {/* Expanded instructions */}
                      {isExpanded && task.instructions && task.instructions.length > 0 && (
                        <div className="px-4 pb-4 pl-[52px]">
                          <ol className="space-y-1.5">
                            {task.instructions.map((step, i) => (
                              <li key={i} className="text-xs text-[var(--lg-text-muted)] flex items-start gap-2">
                                <span className="text-[var(--lg-accent)] font-bold flex-shrink-0 w-4 text-right">{i + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add task */}
                <div className="px-4 py-2">
                  {addingTo === milestone.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && addTask(milestone.id)}
                        placeholder="New task title..."
                        className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-[var(--lg-bg)] border border-[var(--lg-border-subtle)] text-[var(--lg-text-primary)] placeholder:text-[var(--lg-text-muted)] outline-none focus:border-[var(--lg-accent)]"
                        autoFocus
                      />
                      <button onClick={() => addTask(milestone.id)} className="text-xs font-bold text-[var(--lg-accent)] hover:underline">Add</button>
                      <button onClick={() => { setAddingTo(null); setNewTitle(""); }} className="text-xs text-[var(--lg-text-muted)] hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(milestone.id)}
                      className="flex items-center gap-1.5 text-xs text-[var(--lg-text-muted)] hover:text-[var(--lg-accent)] transition-colors"
                    >
                      <Plus size={12} /> Add task
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
