---
title: "refactor: Complete backlog — tables, type safety, AI cache, code cleanup, SaaS planning"
type: refactor
status: active
date: 2026-03-23
---

# Backlog Mega-Plan — 10 Items in Priority Order

## Overview

10 backlog items spanning table UX, type safety, performance, code cleanup, AI infrastructure, and SaaS planning. Grouped into 4 phases by dependency and effort.

---

## Phase 1: Quick Wins (Small Effort, High Impact)

### 1A. Remove `syncNLPlayers` (Dead Code)

**Problem:** `syncNLPlayers` is superseded by `syncAllPlayers` (which syncs all 30 teams). It's still exported and imported but never called from any route.

**Fix:**
- [ ] Remove `syncNLPlayers` and `fetchNLTeams` from `server/src/features/players/services/mlbSyncService.ts`
- [ ] Remove import from `server/src/features/admin/routes.ts`
- [ ] Remove tests for `syncNLPlayers` and `fetchNLTeams` from `mlbSyncService.test.ts`
- [ ] Verify no other files import these functions

**Effort:** 15 min

---

### 1B. Fix `requireCommissionerOrAdmin` for Auction Endpoints

**Problem:** `requireCommissionerOrAdmin` reads `leagueId` from `req.params` but auction endpoints pass it via `req.body` or `req.query`. The `/complete` endpoint currently uses `requireAdmin` as a workaround.

**Fix:**
- [ ] Update `requireCommissionerOrAdmin` in `server/src/middleware/auth.ts` to also check `req.body` and `req.query` (matching `readLeagueId` pattern)
- [ ] Or: create `requireCommissionerOrAdminFromBody(field)` variant
- [ ] Restore `/complete` to use `requireCommissionerOrAdmin` instead of `requireAdmin`
- [ ] Test: commissioner (non-admin) can end auction

**Files:** `server/src/middleware/auth.ts`, `server/src/features/auction/routes.ts`
**Effort:** 20 min

---

### 1C. Extract `expandAndSplitTwoWayStats()` Helper

**Problem:** Ohtani stat-zeroing logic (zero out hitting for pitcher row, pitching for hitter row) is done inline in `server/src/features/players/routes.ts:354-371`. If a new caller fetches player stats, they must remember to apply the same zeroing.

**Fix:**
- [ ] Extract `splitTwoWayStats(players)` function into `server/src/features/players/services/statsService.ts`
- [ ] Function: after `expandTwoWayPlayers`, zero out cross-stats for TWO_WAY_PLAYERS entries
- [ ] Replace inline logic in routes.ts with the helper call
- [ ] Test: pitcher row has hitting stats zeroed, hitter row has pitching stats zeroed

**Files:** `server/src/features/players/services/statsService.ts`, `server/src/features/players/routes.ts`
**Effort:** 20 min

---

### 1D. Stabilize `enrichedPlayers` Dependency

**Problem:** In the auction, the `enrichedPlayers` useMemo recalculates on every bid because the auction state object changes. This causes unnecessary re-renders of the entire player pool.

**Fix:**
- [ ] Add `rosterFingerprint` — hash of roster entries (sorted player IDs) per team
- [ ] Only recompute `enrichedPlayers` when `rosterFingerprint` changes (player actually drafted), not on every bid
- [ ] Or: use `useDeferredValue` on the roster data feeding into enrichedPlayers

**Files:** `client/src/features/auction/components/PlayerPoolTab.tsx` or `AuctionStage.tsx`
**Effort:** 30 min

---

## Phase 2: Type Safety (Medium Effort, Long-Term Quality)

### 2A. Type `mlbGetJson` Return — Eliminate `any` Chain

**Problem:** `mlbGetJson` returns `Promise<any>`, infecting all downstream consumers: `fetchPlayerStats`, `fetchPlayerFieldingStats`, `extractFieldingPositions`, and every MLB API call site. TypeScript can't catch property access errors.

**Fix:**
- [ ] Make `mlbGetJson` generic: `mlbGetJson<T = unknown>(url, ttl): Promise<T>`
- [ ] Define interfaces for MLB API responses:
  - `MlbTeamsResponse` — `{ teams: MlbTeam[] }`
  - `MlbRosterResponse` — `{ roster: MlbRosterPerson[] }`
  - `MlbPersonStats` — `{ id: number; stats: MlbStatGroup[] }`
  - `MlbStatGroup` — `{ group: { displayName: string }; splits: MlbStatSplit[] }`
  - `MlbStatSplit` — `{ stat: { position?: { abbreviation: string }; games?: number; ... } }`
- [ ] Update call sites to use typed generics:
  ```typescript
  const data = await mlbGetJson<MlbTeamsResponse>(url);
  // data.teams is MlbTeam[] — no cast needed
  ```
- [ ] Type `extractFieldingPositions(player: MlbPersonStats)` instead of `any`
- [ ] Type `fetchPlayerBatch` return as `Promise<MlbPersonStats[]>`

**Files:**
- `server/src/lib/mlbApi.ts` — generic signature
- `server/src/features/players/services/mlbSyncService.ts` — typed call sites
- New: `server/src/types/mlbApi.ts` — MLB API response interfaces

**Effort:** 45 min

---

## Phase 3: Table Design Refresh (Medium-Large Effort, Visual Impact)

### 3A. Density Prop on TableCell

**Problem:** All tables use the same row height/font size. Stat-heavy tables (Players, Standings) need tighter rows for more data per screen. Summary tables (Team overview) need more breathing room.

**Fix:**
- [ ] Add `density` prop to `TableCell` in `client/src/components/ui/table.tsx`
- [ ] Three tiers: `compact` (28px, 12px), `default` (36px, 13px), `comfortable` (46px, 15px — current)
- [ ] Pass density via React context from `ThemedTable` to avoid prop drilling
- [ ] Apply `default` to stat-heavy tables (Players, Standings, StatsTables)
- [ ] Keep `comfortable` for summary tables (Team page, Commissioner)

**Files:** `client/src/components/ui/table.tsx`, `client/src/components/ui/ThemedTable.tsx`

---

### 3B. Sticky First Column for Mobile

**Problem:** On mobile, horizontal scrolling stat tables lose the player name column. Users scroll right and lose context of whose stats they're looking at.

**Fix:**
- [ ] Add `stickyFirstCol` prop to `ThemedTable`
- [ ] Apply `position: sticky; left: 0; z-index: 5;` to first `<td>` and `<th>` in each row
- [ ] Opaque background on sticky column (use `--lg-table-header-sticky-bg` token)
- [ ] Corner cell (top-left) at `z-index: 15` (above both sticky header and sticky column)
- [ ] Apply to Players page and StatsTables

**Files:** `client/src/components/ui/ThemedTable.tsx`, `client/src/features/players/pages/Players.tsx`

---

### 3C. SortableHeader Component

**Problem:** Sort logic (click → toggle direction → render ▲/▼) is duplicated inline 10+ times in `Players.tsx`. Each stat column repeats the same pattern.

**Fix:**
- [ ] Create `client/src/components/ui/SortableHeader.tsx`
- [ ] Props: `label`, `sortKey`, `currentSort`, `currentDesc`, `onSort`, `align`
- [ ] Renders: label + sort indicator (▲/▼ visible when active, faded on hover when inactive)
- [ ] First click on counting stats → descending; rate stats → context-aware (ERA ascending)
- [ ] Replace inline sort logic in Players.tsx

**Files:** New `client/src/components/ui/SortableHeader.tsx`, `client/src/features/players/pages/Players.tsx`

---

### 3D. Zebra Striping + Semantic Color Tokens

**Fix:**
- [ ] Apply `--lg-table-row-alt` on `<tbody>` via `[&>tr:nth-child(even)]` selector
- [ ] Add `--lg-positive` / `--lg-negative` semantic tokens to `index.css` (mode-aware)
- [ ] Replace hardcoded `text-emerald-400` / `text-rose-400` in StatsTables with semantic tokens

**Files:** `client/src/index.css`, `client/src/components/shared/StatsTables.tsx`

---

### 3E. Split Filter/Sort useMemo in Players.tsx

**Problem:** Single useMemo in Players.tsx re-runs both filter AND sort when only the sort key changes.

**Fix:**
- [ ] Split into two memos: `filteredPlayers` (depends on filters) and `sortedPlayers` (depends on filtered + sort key)
- [ ] Add `useDeferredValue` for search input debouncing

**Files:** `client/src/features/players/pages/Players.tsx`

---

## Phase 4: AI Infrastructure + SaaS Planning

### 4A. Server-Side AI Cache

**Problem:** Every AI analysis call hits the LLM even for the same data. Draft grades are generated fresh each time despite the auction data being frozen.

**Fix:**
- [ ] Create `AiCache` table in Prisma schema: `{ id, featureType, entityKey, result (JSON), generatedAt }`
- [ ] Or simpler: use `AuctionSession` or a JSON column on League
- [ ] Wrap AI service calls: check cache first, return cached if < 6 hours old
- [ ] Add `force: true` param to bypass cache
- [ ] Return `generatedAt` in all AI responses for client freshness display
- [ ] Add freshness indicators to AI Hub cards (green/amber dots)

**Files:** `prisma/schema.prisma`, `server/src/services/aiAnalysisService.ts`, `client/src/features/ai/pages/AIHub.tsx`
**Effort:** 45 min

---

### 4B. Inline AI Badges on Feature Pages

**Problem:** Users only see AI features if they visit the `/ai` hub. Contextual discovery is missing.

**Fix:**
- [ ] Create `<AIBadge feature="trade-analysis" />` shared component
- [ ] Shows ✨ sparkle when available, 🔒 lock when not, with tooltip
- [ ] Add to: Auction page header, Trades section on Activity, Teams page, Archive page
- [ ] Clicking navigates to `/ai` or scrolls to the inline feature

**Files:** New `client/src/components/ui/AIBadge.tsx`, modify 4-5 page files
**Effort:** 30 min

---

### 4C. SaaS Phase 1 Planning (Research Only)

**Problem:** Currently a single-league tool. Vision: multi-league SaaS with snake draft, public directory, SEO/marketing.

**Research topics:**
- [ ] Multi-tenancy: franchise-level isolation (already have Franchise model)
- [ ] Pricing model: free tier (1 league) vs paid (multi-league, AI features)
- [ ] Snake draft: separate from auction module or parameterized draft system?
- [ ] Public league directory: search, join, discover leagues
- [ ] Onboarding flow: create account → create/join league → configure → draft
- [ ] Marketing pages: landing, features, pricing (separate from app)

**Output:** A dedicated SaaS plan document (not code changes)
**Effort:** Research session, no implementation

---

## Execution Order

| Order | Phase | Items | Effort | Dependencies |
|-------|-------|-------|--------|-------------|
| 1 | Quick Wins | 1A, 1B, 1C, 1D | ~1.5 hours | None — all independent |
| 2 | Type Safety | 2A | ~45 min | None |
| 3 | Tables | 3A-3E | ~2-3 hours | 3A before 3B-3E |
| 4 | AI + SaaS | 4A, 4B, 4C | ~2 hours | AI Hub exists (done) |

Quick wins (Phase 1) can all run in parallel. Table work (Phase 3) is the largest block and benefits from visual testing. AI cache (4A) and badges (4B) build on the AI Hub page.

---

## Sources

- Session 36 code review findings (PR #84) — P2-4 type safety, P3 cleanup items
- Session 37 deepened plan — Phase 4 table design research (FanGraphs, Baseball Reference, ESPN patterns)
- AI features visibility plan — `docs/plans/2026-03-23-feat-ai-features-visibility-plan.md`
- Past learnings: `docs/solutions/ui-bugs/css-sticky-fails-nested-overflow-containers.md`
- Memory: `project_saas_vision.md` — SaaS vision notes
