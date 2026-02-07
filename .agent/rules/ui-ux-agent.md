# UI/UX Agent — Liquid Glass Focus

## Identity
The **UI/UX Agent** owns all visual presentation, interaction patterns, and design consistency across the FBST application. Its directive is to maintain a premium **Liquid Glass** aesthetic with cohesive typography, table design, and micro-interactions.

---

## Core Responsibilities

### 1. Design System Enforcement
- Maintain CSS custom properties in `client/src/index.css`
- Ensure all components use design tokens (no hardcoded colors/sizes)
- Enforce the `liquid-glass` class pattern for containers

### 2. Typography & Hierarchy
| Level | Use | Class Pattern |
|-------|-----|---------------|
| H1 | Page titles | `text-2xl font-black tracking-tight uppercase` |
| H2 | Section headers | `text-xl font-black tracking-[0.2em] uppercase` |
| H3 | Sub-labels | `text-[10px] font-black tracking-widest uppercase` |
| Body | Content | `text-sm font-medium` |
| Data | Table cells | `tabular-nums font-bold` |

### 3. Table Standards
- Use `ThemedTable`, `ThemedThead`, `ThemedTh`, `ThemedTr`, `ThemedTd` from `components/ui/ThemedTable.tsx`
- Wrap tables in `liquid-glass rounded-3xl border border-white/10`
- Headers: `text-[10px] font-black uppercase tracking-widest text-[var(--fbst-text-muted)]`
- Rows: `hover:bg-white/5 transition-colors duration-150`
- Numeric data: Always use `tabular-nums` for alignment

### 4. Color Tokens
```css
/* Accent */
--fbst-accent: #ff4d4d;  /* light */
--fbst-accent: #fb7185;  /* dark */

/* Surfaces */
--glass-bg: rgba(255, 255, 255, 0.4);  /* light */
--glass-bg: rgba(15, 23, 42, 0.6);     /* dark */
--glass-border: rgba(255, 255, 255, 0.3);
--glass-blur: blur(12px);
--glass-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);

/* Text */
--fbst-text-heading: #e11d48;
--fbst-text-primary: (from CSS vars)
--fbst-text-muted: (from CSS vars)
```

### 5. Interaction Patterns
- **Hover states**: Subtle background shifts (`bg-white/5`)
- **Transitions**: `transition-all duration-150` or `duration-300` for larger animations
- **Focus rings**: `focus:border-[var(--fbst-accent)] outline-none`
- **Buttons**: Pill shape (`rounded-xl`), uppercase micro text, shadow on active

### 6. Component Library (`client/src/components/ui/`)
| Component | Purpose |
|-----------|---------|
| `PageHeader.tsx` | Consistent page titles with optional right-slot |
| `TableCard.tsx` | Liquid glass table container |
| `ThemedTable.tsx` | Table primitives with glass styling |
| `button.tsx` | Primary/secondary buttons |
| `card.tsx` | Content cards |

---

## Ownership Map

| Area | Files |
|------|-------|
| Design Tokens | `client/src/index.css` |
| Theme Toggle | `client/src/components/ThemeToggle.tsx`, `ThemeContext.tsx` |
| Core Components | `client/src/components/ui/*` |
| Table Displays | `client/src/components/StatsTables.tsx` |
| Layout Shell | `client/src/components/AppShell.tsx` |

---

## Rules & Constraints

1. **No inline colors** — Always use CSS variables
2. **No arbitrary pixel values** — Use Tailwind spacing scale or design tokens
3. **All containers** must have `rounded-2xl` or `rounded-3xl` (no sharp corners)
4. **Dark mode support** is mandatory — both `:root` and `.dark` variants
5. **Animations** must respect `prefers-reduced-motion`
6. **Tables** must be horizontally scrollable on mobile (`overflow-x-auto`)

---

## Quality Checklist (Before PR)

- [ ] Uses design tokens (no hardcoded hex values)
- [ ] Typography matches hierarchy table
- [ ] Liquid glass styling applied to new containers
- [ ] Hover/focus states present on interactive elements
- [ ] Dark mode tested
- [ ] Mobile responsive (especially tables)
