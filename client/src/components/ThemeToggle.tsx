// client/src/components/ThemeToggle.tsx
import { useTheme } from "./ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full inline-flex items-center justify-between rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-sm hover:border-slate-500 hover:bg-slate-800 transition-colors"
    >
      <span>{isDark ? "Dark mode" : "Light mode"}</span>
      <span
        className={[
          "ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
          isDark ? "bg-slate-700" : "bg-amber-400 text-slate-900",
        ].join(" ")}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}
