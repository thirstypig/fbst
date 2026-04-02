---
title: "overflow-x-hidden on AppShell blocks all child horizontal scroll"
category: ui-bugs
component:
  - AppShell
  - Players
  - ThemedTable
symptoms:
  - Tables on mobile (390px) compress columns to unreadable widths instead of scrolling
  - No horizontal scroll affordance despite overflow-x-auto on table wrappers
  - Stats columns (HR, RBI, SB, AVG) invisible or squeezed to ~24px on phones
root_cause: "AppShell's overflow-x-hidden creates a scroll context that blocks all descendant overflow-x-auto containers"
date_encountered: 2026-04-02
severity: medium
tags:
  - overflow-x
  - horizontal-scroll
  - mobile-layout
  - css-scroll-context
  - min-width
related:
  - css-sticky-fails-nested-overflow-containers.md
  - ios-viewport-height-and-touch-target-sizing.md
---

# overflow-x-hidden on AppShell Blocks All Child Horizontal Scroll

## Problem

On mobile devices (390px viewport), tables across the app could not be scrolled horizontally. Instead of offering a scroll affordance, columns compressed to illegible widths (text-[8px], columns ~24px). This affected Players, Standings, Activity, and every page using ThemedTable.

The table wrappers had `overflow-x-auto` — which should enable scrolling — but it had no effect.

## Symptoms

- Players page: 10+ stat columns squeezed into 390px, unreadable
- Touch swipe left/right on table did nothing
- Desktop was unaffected (tables fit at 1024px+)
- No console errors — a completely silent failure

## Root Cause

**CSS overflow propagation.** The AppShell layout container had `overflow-x-hidden`, which creates a "block formatting context" per the CSS Overflow Module spec. This scroll context traps all descendant overflow behaviors — child elements with `overflow-x-auto` cannot establish their own scroll contexts.

The DOM chain was:

```
AppShell (overflow-x-hidden)     ← BLOCKS all child scroll
  └─ Players page (overflow-hidden)  ← Also blocks
       └─ Results wrapper (overflow-auto)  ← Tries to scroll, blocked
            └─ Card wrapper (overflow-x-auto)  ← Also blocked
                 └─ <table>  ← Cannot scroll
```

**Key CSS spec distinction:**

| Property | Clips Content | Creates Scroll Context | Blocks Child Scroll |
|----------|--------------|----------------------|-------------------|
| `overflow-x: hidden` | Yes | Yes | **Yes** |
| `overflow-x: clip` | Yes | **No** | **No** |
| `overflow-x: auto` | If needed | Yes | Yes (if nested) |

`overflow: clip` was added to the CSS spec specifically to solve this problem — clip visual overflow without interfering with descendant scroll containers.

## Solution

Three coordinated changes across the overflow chain:

### 1. AppShell.tsx — Replace `overflow-x-hidden` with `overflow-x-clip`

```tsx
// BEFORE (line 199)
<div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-all duration-300">

// AFTER
<div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-clip transition-all duration-300">
```

**Why clip, not removal?** The overflow property exists to prevent the mobile sidebar drawer from leaking past the viewport edge. `clip` preserves that visual clipping without blocking child scroll.

### 2. Players.tsx — Constrain to viewport width + enable scroll wrapper

```tsx
// BEFORE (line 196)
<div className="h-[100svh] flex flex-col overflow-hidden scrollbar-hide">
  ...
  <div className="flex-1 overflow-auto max-w-6xl mx-auto px-4 pb-8">
    <div className="lg-card p-0 bg-transparent ...">

// AFTER
<div className="flex flex-col min-h-0 w-full max-w-[100vw] overflow-x-hidden scrollbar-hide"
     style={{ height: '100svh' }}>
  ...
  <div className="flex-1 overflow-auto max-w-6xl w-full mx-auto px-4 pb-8">
    <div className="lg-card p-0 bg-transparent ... overflow-x-auto">
```

Key additions:
- `max-w-[100vw]` constrains page to viewport width
- `overflow-x-auto` on the card wrapper enables horizontal scroll
- `min-h-0` allows flex children to respect computed height

### 3. ThemedTable.tsx — Add min-width to force scroll instead of compression

```tsx
// BEFORE
<table className={cn("w-full caption-bottom text-sm", ...)}>

// AFTER
<table className={cn("w-full min-w-[600px] caption-bottom text-sm", ...)}>
```

Without `min-w-[600px]`, the table compresses all columns into 390px. The min-width forces the browser to trigger horizontal scroll on the `overflow-x-auto` wrapper instead.

## Why Not Other Approaches?

| Approach | Verdict | Reason |
|----------|---------|--------|
| Remove `overflow-x-hidden` entirely | Rejected | Sidebar drawer would leak past viewport on mobile |
| `overflow: clip` (both axes) | Valid but overkill | Only x-axis needed clipping; y-axis works fine |
| CSS Grid tables | Rejected | Would break existing sticky header logic, massive rewrite |
| Per-page scroll fixes | Rejected | Root cause is in AppShell; fixing there fixes all pages |

## Prevention

### Rules

1. **Layout containers (AppShell, page wrappers, modals) must use `overflow-x-clip`, never `overflow-x-hidden`**
2. **Scrollable table wrappers need `overflow-x-auto` on the immediate parent of `<table>`**
3. **Tables need `min-w-[600px]` (or wider) to prevent column compression on mobile**

### Before Modifying Overflow Properties

- [ ] Check the full ancestor chain for `overflow-x: hidden` — use DevTools, walk up from the target element
- [ ] Test at 390px (mobile), 600px (tablet), and 1024px+ (desktop)
- [ ] Verify horizontal scroll works on all table pages (Players, Standings, Activity, Auction)
- [ ] Confirm sticky headers still work after changes (sticky requires compatible overflow context)

### Quick DevTools Diagnosis

1. Right-click non-scrolling table → Inspect
2. Walk up DOM tree, checking Styles panel for `overflow-*` rules
3. First ancestor with `overflow-x: hidden` is the blocker
4. Change to `overflow-x-clip` in DevTools to verify, then fix in source

## Cross-References

- **[CSS Sticky Failures](css-sticky-fails-nested-overflow-containers.md)** — Covers how `overflow: auto` on shadcn Table wrapper blocks sticky positioning. Same category of overflow propagation bugs.
- **[iOS Viewport Height](ios-viewport-height-and-touch-target-sizing.md)** — Explains why `100svh` (not `100vh`) is correct for stable mobile layouts. The Players page fix uses `100svh`.
- **[W3C CSS Overflow Module Level 3](https://www.w3.org/TR/css-overflow-3/)** — Spec that defines `clip` behavior and scroll context creation rules.

## Verification

Tested on 390px viewport (Playwright):
- Players page: table scrolls horizontally, all stat columns accessible
- Season/Period standings: tables scroll, team names readable
- Sticky headers remain fixed during horizontal scroll
- Sidebar drawer still clips correctly (no viewport leakage)
- Light/dark mode: no color regressions
