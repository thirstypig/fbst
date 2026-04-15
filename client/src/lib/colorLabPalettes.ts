/**
 * Shared palette data + boot-time reapply helper for the Concepts Color Lab.
 *
 * The UI component in `features/admin/components/ColorLab.tsx` lets the user
 * preview a palette site-wide. The choice is persisted to sessionStorage
 * under `STORAGE_KEY` so it survives:
 *   • Client-side nav (inline CSS variables on <html> persist naturally)
 *   • Full page reloads (on boot, `applyPersistedPalette()` below reapplies
 *     from sessionStorage before React mounts)
 *
 * When a user is ready to ship a palette, edit `client/src/index.css` tokens
 * to match and remove this lab file — or keep the lab for ongoing iteration.
 */

export interface Palette {
  id: string;
  name: string;
  mode: "dark" | "light";
  tagline: string;
  tokens: Record<string, string>;
}

export const DARK_PALETTES: Palette[] = [
  {
    id: "current-dark",
    name: "Current (Midnight Blue)",
    mode: "dark",
    tagline: "Today's dark — deep navy with bright blue accent",
    tokens: {
      "--lg-bg-page": "#0b1220",
      "--lg-bg-card": "#111a2b",
      "--lg-tint": "rgba(26, 117, 255, 0.06)",
      "--lg-accent": "#1a75ff",
      "--lg-text-primary": "#e6eefc",
      "--lg-text-heading": "#ffffff",
      "--lg-text-muted": "#8a99b5",
      "--lg-border-subtle": "rgba(255,255,255,0.08)",
    },
  },
  {
    id: "slate",
    name: "Neutral Slate",
    mode: "dark",
    tagline: "Less blue, more neutral slate — professional, not gaming",
    tokens: {
      "--lg-bg-page": "#0f1216",
      "--lg-bg-card": "#181c22",
      "--lg-tint": "rgba(255, 255, 255, 0.04)",
      "--lg-accent": "#38bdf8",
      "--lg-text-primary": "#e2e8f0",
      "--lg-text-heading": "#f8fafc",
      "--lg-text-muted": "#94a3b8",
      "--lg-border-subtle": "rgba(255,255,255,0.07)",
    },
  },
  {
    id: "graphite",
    name: "Graphite + Amber",
    mode: "dark",
    tagline: "Warm gray base, amber accent — softer, less sports-betting",
    tokens: {
      "--lg-bg-page": "#16161a",
      "--lg-bg-card": "#1e1e24",
      "--lg-tint": "rgba(251, 191, 36, 0.05)",
      "--lg-accent": "#fbbf24",
      "--lg-text-primary": "#e4e4e7",
      "--lg-text-heading": "#fafafa",
      "--lg-text-muted": "#a1a1aa",
      "--lg-border-subtle": "rgba(255,255,255,0.06)",
    },
  },
  {
    id: "forest",
    name: "Forest Green",
    mode: "dark",
    tagline: "Deep forest bg, emerald accent — recalls outfield grass",
    tokens: {
      "--lg-bg-page": "#0c1512",
      "--lg-bg-card": "#141f1a",
      "--lg-tint": "rgba(16, 185, 129, 0.06)",
      "--lg-accent": "#10b981",
      "--lg-text-primary": "#e5ede8",
      "--lg-text-heading": "#f0fdf4",
      "--lg-text-muted": "#86a295",
      "--lg-border-subtle": "rgba(255,255,255,0.07)",
    },
  },
  {
    id: "crimson",
    name: "Ink + Crimson",
    mode: "dark",
    tagline: "Near-black canvas, crimson accent — newspaper/sportsbook energy",
    tokens: {
      "--lg-bg-page": "#0a0a0c",
      "--lg-bg-card": "#15151a",
      "--lg-tint": "rgba(225, 29, 72, 0.05)",
      "--lg-accent": "#e11d48",
      "--lg-text-primary": "#e5e5e7",
      "--lg-text-heading": "#fafafa",
      "--lg-text-muted": "#8e8e94",
      "--lg-border-subtle": "rgba(255,255,255,0.06)",
    },
  },
];

export const LIGHT_PALETTES: Palette[] = [
  {
    id: "current-light",
    name: "Current (Cool Paper)",
    mode: "light",
    tagline: "Today's light — pale cool paper, may read as too washed-out",
    tokens: {
      "--lg-bg-page": "#f4f7fb",
      "--lg-bg-card": "#ffffff",
      "--lg-tint": "rgba(0, 45, 114, 0.04)",
      "--lg-accent": "#1a75ff",
      "--lg-text-primary": "#1a2435",
      "--lg-text-heading": "#0b1220",
      "--lg-text-muted": "#576275",
      "--lg-border-subtle": "rgba(0, 45, 114, 0.12)",
    },
  },
  {
    id: "warm-paper",
    name: "Warm Newsprint",
    mode: "light",
    tagline: "Ivory + deep navy ink — baseball-card warmth, easier on the eyes",
    tokens: {
      "--lg-bg-page": "#f5f1e8",
      "--lg-bg-card": "#fbf7ee",
      "--lg-tint": "rgba(15, 23, 42, 0.04)",
      "--lg-accent": "#1e3a8a",
      "--lg-text-primary": "#1f2937",
      "--lg-text-heading": "#0f172a",
      "--lg-text-muted": "#6b7280",
      "--lg-border-subtle": "rgba(15, 23, 42, 0.12)",
    },
  },
  {
    id: "cool-stone",
    name: "Cool Stone",
    mode: "light",
    tagline: "Mid-gray stone bg — more contrast than pale, less stark than white",
    tokens: {
      "--lg-bg-page": "#e4e7ec",
      "--lg-bg-card": "#f5f7fa",
      "--lg-tint": "rgba(15, 23, 42, 0.05)",
      "--lg-accent": "#0f766e",
      "--lg-text-primary": "#111827",
      "--lg-text-heading": "#030712",
      "--lg-text-muted": "#4b5563",
      "--lg-border-subtle": "rgba(15, 23, 42, 0.14)",
    },
  },
  {
    id: "cream",
    name: "Cream + Rust",
    mode: "light",
    tagline: "Baseball-card cream, rust accent — nostalgic, distinctive",
    tokens: {
      "--lg-bg-page": "#faf3e7",
      "--lg-bg-card": "#fffaf0",
      "--lg-tint": "rgba(124, 45, 18, 0.05)",
      "--lg-accent": "#b45309",
      "--lg-text-primary": "#292524",
      "--lg-text-heading": "#1c1917",
      "--lg-text-muted": "#78716c",
      "--lg-border-subtle": "rgba(124, 45, 18, 0.14)",
    },
  },
];

export const ALL_PALETTES: Palette[] = [...DARK_PALETTES, ...LIGHT_PALETTES];

export const COLOR_LAB_STORAGE_KEY = "fbst:color-lab-preview";

export const COLOR_LAB_OVERRIDE_KEYS = [
  "--lg-bg-page",
  "--lg-bg-card",
  "--lg-tint",
  "--lg-accent",
  "--lg-text-primary",
  "--lg-text-heading",
  "--lg-text-muted",
  "--lg-border-subtle",
] as const;

export function findPaletteById(id: string | null | undefined): Palette | undefined {
  if (!id) return undefined;
  return ALL_PALETTES.find((p) => p.id === id);
}

export function applyPalette(p: Palette, persist = true): void {
  const root = document.documentElement;
  // Sync with ThemeProvider's canonical store so it doesn't fight us on mount.
  // The Provider reads `fbst-theme` from localStorage and applies the .dark
  // class from its own effect. Writing here ensures both agree.
  try {
    localStorage.setItem("fbst-theme", p.mode);
  } catch {
    // ignore — class toggle below still applies for this session
  }
  root.classList.remove("dark", "light");
  root.classList.add(p.mode);
  for (const [key, value] of Object.entries(p.tokens)) {
    root.style.setProperty(key, value);
  }
  if (persist) {
    try {
      sessionStorage.setItem(COLOR_LAB_STORAGE_KEY, p.id);
    } catch {
      // Non-critical — preview just won't survive reload.
    }
  }
}

export function resetPalette(): void {
  const root = document.documentElement;
  for (const key of COLOR_LAB_OVERRIDE_KEYS) root.style.removeProperty(key);
  try {
    sessionStorage.removeItem(COLOR_LAB_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Call once during app boot (before React renders) to reapply a persisted
 * preview from the user's previous session. Idempotent and safe on SSR-less
 * clients — noops if sessionStorage is empty or the stored id is unknown.
 */
export function applyPersistedPalette(): void {
  try {
    const id = sessionStorage.getItem(COLOR_LAB_STORAGE_KEY);
    if (!id) return;
    const p = findPaletteById(id);
    if (p) applyPalette(p, /* persist */ false);
  } catch {
    // sessionStorage unavailable (private browsing, etc) — skip silently.
  }
}
