# C.P.L.A.N. — FBST SaaS Evolution

> From single-league tool to multi-sport fantasy SaaS platform with sneaker-model branding

---

## C — Context

### Where We Are
- **19 feature modules** (client/server mirrored), 730 tests, 60K+ LOC
- **Auction-first**: 14 components, 5 hooks, real-time bidding, AI bid advice, spending pace, value overlays
- **8 AI features** powered by Gemini 2.5 Flash + Claude Sonnet 4 (league-context-aware — ahead of every major platform)
- **Commissioner superpowers**: franchise model, season lifecycle, roster import, financial tracking, audit logs
- **Archive**: multi-year historical data import (Excel + CSV)
- **Design system**: liquid glass, dark/light mode, `--lg-*` CSS tokens, Inter font, responsive
- **Stack**: React 18 + Vite + Tailwind + shadcn + Express + Prisma + Supabase + PostgreSQL

### What We're Missing for SaaS
- No self-service onboarding (admin creates leagues)
- No snake draft engine (~60% of baseball leagues use snake)
- No H2H matchup system (~40% of leagues)
- No public landing/marketing pages (About.tsx is post-login)
- No pricing tiers or payment integration
- Dev pages (Changelog, Roadmap, Status) locked behind admin
- No mobile bottom nav (hamburger only)
- No multi-sport support yet
- No league migration tools (import from Yahoo/ESPN)

### Competitive Landscape
| Platform | Strengths | Weaknesses | Our Edge |
|----------|-----------|------------|----------|
| Yahoo | Largest user base, mature baseball | Dated UI, weak auction, clunky mobile | Auction UX, AI, commissioner tools |
| ESPN | Brand trust, media integration | Buggy, weak commissioner tools | Reliability, customization |
| Sleeper | Best mobile UX, social/chat | Limited baseball, auction is secondary | Baseball depth, auction-first |
| Fantrax | Most customizable scoring | Ugly UI, poor mobile | Design quality, AI layer |
| Ottoneu | Analytics-savvy, loyal niche | Tiny user base, dated UX | Modern UX + same depth |

---

## P — Phases

### Phase 1: Polish & Foundation (Sessions 40-45)
**Goal:** Make the existing product SaaS-ready for baseball auction/roto leagues.

- [ ] **Code review fixes** — resolve 14 findings from Session 39 review (1 P1, 8 P2, 5 P3)
- [ ] **Sidebar redesign** — reorganize nav for two audiences (member vs commissioner)
  - Core Nav: Home, Season, Players, Auction, Activity
  - AI section: League Digest, Draft Report, Team Insights, Trade Advisor
  - League: Rules, Payouts, Archive, Keepers
  - Manage: Commissioner, Admin (role-gated)
  - Product: Changelog, Roadmap, Status (public-accessible)
- [ ] **Mobile bottom tab nav** — 5 tabs (Home, My Team, Players, Activity, More)
- [ ] **Empty states** — design proper empty states for every page with contextual CTAs
- [ ] **Public pages layer** — Changelog, Roadmap, Status accessible without admin role
- [ ] **Self-service league creation** — commissioner creates franchise + league via wizard
- [ ] **Member onboarding flow** — accept invite → create account → team setup → quick tour
- [ ] **Weekly insights history** (done ✅) — tab-based week navigation on team page

### Phase 2: Format Expansion (Sessions 46-52)
**Goal:** Support snake draft and H2H to capture 70%+ of the baseball market.

- [ ] **Snake draft engine** — pick order generation, auto-pick, draft board UI, pick trading
- [ ] **H2H categories matchup system** — weekly matchups, win/loss tracking, playoff bracket
- [ ] **H2H points scoring** — configurable point values per stat category
- [ ] **League format selector** — wizard step: Roto vs H2H Categories vs H2H Points
- [ ] **Draft type selector** — Auction vs Snake (separate draft room UIs)
- [ ] **Yahoo/ESPN import** — CSV import tool for league migration (rosters, standings, history)
- [ ] **Best Ball mode** — auto-optimized lineups, no weekly management

### Phase 3: AI & Engagement (Sessions 53-58)
**Goal:** Make AI the killer feature and add social/engagement layers.

- [ ] **AI Chat Assistant** — persistent panel: "Should I trade X for Y?", "Who should I target on waivers?"
- [ ] **Inline AI signals** — "Buy Low" / "Sell High" / "Injury Risk" badges on player rows
- [ ] **AI-powered trade suggestions** — proactive: "Team X needs SB, you have surplus — propose this trade"
- [ ] **Reactions on transactions** — emoji reactions (fire, clown, trophy) on trades/waivers in activity feed
- [ ] **League chat** — Discord-style chat per league, integrated with transaction notifications
- [ ] **Achievement badges** — earned via activity (Best Draft Pick, Dynasty, Steal of the Draft, etc.)
- [ ] **Weekly email digest** — via Resend, linking back to app (drives re-engagement)
- [ ] **Push notifications** — trade proposals, waiver results, your-player alerts
- [ ] **Spark-line mini charts** — tiny trend lines next to key stats on player and team pages

### Phase 4: Monetization & Sneaker Model (Sessions 59-65)
**Goal:** Launch pricing tiers with sneaker-model scarcity mechanics.

- [ ] **Pricing tiers**:
  - Free (General Release): standard leagues, basic stats, manual draft
  - Pro ($9.99/mo — Limited Edition): AI features, weekly insights, trade analyzer, early access
  - Elite ($29.99/mo — Collab Drop): custom AI models, white-label, priority support, invite-only
- [ ] **Season Pass** ($19.99/season): progression rewards, seasonal badges, exclusive content
- [ ] **Payment integration** — Stripe for subscriptions, league dues escrow
- [ ] **Commissioner reputation system** — Rookie → Verified → Elite → Ambassador
- [ ] **Badge/trophy system** — time-limited seasonal badges, rarity tiers, trophy case on profiles
- [ ] **League format drops** — exclusive formats released seasonally with limited availability
- [ ] **Waitlist mechanics** — capped Pro tier, "Got 'Em" notification when spot opens
- [ ] **Per-league theming** — commissioner picks accent colors, uploads league logo
- [ ] **Financial payout management** — configurable rules (top 3, weekly prizes, category bonuses)
- [ ] **Venmo/PayPal integration** — pre-filled payment links for league dues

### Phase 5: Multi-Sport Expansion (Sessions 66+)
**Goal:** Reuse the core platform for football, brackets, squares, and pick'em.

- [ ] **Sport-agnostic core** — abstract position config, scoring, roster slots into sport modules
- [ ] **Fantasy Football** — H2H points, snake draft (reuse draft engine), weekly matchups
- [ ] **Super Bowl Squares** — 10x10 grid component, random number assignment, quarter payouts
- [ ] **March Madness Brackets** — 64-team bracket UI, confidence points, Calcutta auction variant
- [ ] **Pick'em / Props** — daily player prop cards (over/under), streak tracking, leaderboards
- [ ] **Year-round engagement** — one league group, multiple games across sports
- [ ] **Sport-specific AI models** — retrain prompts and projections per sport
- [ ] **NFL data integration** — NFL API or stats provider for football

---

## L — Leverage Points

### What We Already Have (Reusable for Multi-Sport)

| Component | Reuse % | Notes |
|-----------|---------|-------|
| Auth + Users + Franchises | 100% | Sport-agnostic |
| League CRUD + Rules engine | 90% | Rules schema needs sport config |
| Auction engine (14 components) | 95% | Budget/bid logic is universal — March Madness Calcutta reuse! |
| Trade engine | 95% | Works for any sport with roster-based trading |
| Waiver/FAAB engine | 95% | Universal claim priority + budget system |
| Commissioner tools | 90% | Role management, season lifecycle universal |
| AI analysis framework | 70% | Prompts are sport-specific, but service layer reusable |
| Design system (`--lg-*` tokens) | 100% | Already sport-neutral |
| Archive/History | 85% | Schema may need sport-specific stat columns |

### The Calcutta Insight
The March Madness Calcutta auction is the same mechanic as our baseball auction: instead of auctioning players, you auction tournament teams. Same bidding, same budget management, same real-time UX — different sport. This is the sneaker model: **same silhouette, different colorway**.

### Our Moat
**League-context AI that compounds over time.** Every existing AI tool gives generic advice. FBST's AI knows your league's scoring, your roster, your opponents' tendencies, your auction history. This gets better every season — creating compounding lock-in that's impossible to replicate without the data.

---

## A — Architecture Decisions

### Decision 1: Sport Config Modules
```
server/src/sports/
├── baseball/
│   ├── positions.ts      # P, C, 1B, 2B, SS, 3B, OF, DH, UT
│   ├── scoring.ts        # Roto categories, H2H points
│   ├── rules.ts          # Default rules, roster sizes
│   └── ai-prompts.ts     # Baseball-specific AI prompt templates
├── football/
│   ├── positions.ts      # QB, RB, WR, TE, K, DEF, FLEX
│   ├── scoring.ts        # Standard, PPR, half-PPR
│   ├── rules.ts
│   └── ai-prompts.ts
└── index.ts              # Sport registry: getSportConfig("baseball")
```

### Decision 2: Draft Engine Abstraction
The auction engine is already feature-rich. Snake draft is a new engine that shares:
- **Shared**: Player pool, roster management, team state, UI chrome (sidebar, player cards)
- **Auction-specific**: Bidding, budget, nomination queue, spending pace
- **Snake-specific**: Pick order, round tracking, auto-pick, pick trading

Both implement a `DraftEngine` interface with common hooks (`useDraftState`, `usePlayerPool`, `useDraftActions`).

### Decision 3: Matchup System (for H2H)
New `Matchup` model in Prisma:
```
model Matchup {
  id        Int    @id @default(autoincrement())
  leagueId  Int
  period    Int    // Week number
  teamAId   Int
  teamBId   Int
  result    Json?  // { teamA: { wins: 5, losses: 4, ties: 1 }, teamB: ... }
}
```
Schedule generation algorithm: round-robin for N teams across M weeks.

### Decision 4: Sidebar Architecture
Replace static nav config with a dynamic `useNavItems()` hook that:
- Reads user role (member, commissioner, admin)
- Reads season status (SETUP, DRAFT, IN_SEASON, COMPLETED)
- Reads feature flags (SaaS tier)
- Returns filtered, ordered nav items with badges

### Decision 5: Per-League Theming
Leverage existing CSS custom property system:
```tsx
// LeagueContext provides theme overrides
<div style={{ '--lg-accent': league.accentColor, '--lg-accent-rgb': league.accentRgb }}>
  <Outlet />
</div>
```
Commissioners pick from a curated palette (like sneaker colorways). No arbitrary hex input — controlled quality.

---

## N — Next Steps (Immediate)

### This Session (Session 40)
1. ~~Weekly insights history tabs~~ ✅ (done)
2. Resolve code review P1 finding (isPitcher/PITCHER_CODES "CL" divergence)
3. Resolve code review P2 quick wins (vote auth, unused variable, dynamic import, empty catch)
4. Update CLAUDE.md, FEEDBACK.md, docs pages

### Next Session (Session 41)
1. Sidebar redesign — reorganize nav sections, add AI cluster
2. Mobile bottom tab nav implementation
3. Public pages layer (Changelog, Roadmap, Status without admin gate)

### Session 42-43
1. Empty states for all pages
2. Commissioner league creation wizard (self-service)
3. Member onboarding flow (invite → account → team → tour)

### Session 44-45
1. Landing page / marketing page (pre-login)
2. Snake draft engine (start)
3. H2H matchup system (start)

---

## Appendix: The Sneaker Model Calendar

| Month | Fantasy Moment | Sneaker-Model Event |
|-------|---------------|---------------------|
| Nov | Hot Stove begins | "Market Watch" content drops — how FA signings affect values |
| Dec | Winter Meetings | Exclusive league format preview ("The Gauntlet" teaser) |
| Jan | Offseason | Draft Lab opens (Pro users get 2-week early access) |
| Feb | Spring Training | Projection updates, badge reveal for upcoming season |
| Mar | Opening Day prep | League format drops, Draft Day special UI activated |
| Apr | Season begins | In-season AI features unlock, weekly digest emails start |
| Jul | Trade Deadline | Platform event — Trade Analyzer Pro, countdown UI, special badges |
| Sep | Playoff push | Championship dashboard, clinch celebrations, "clutch" badges |
| Oct | Season ends | Annual Awards ceremony — MVP, Best Draft, Trade of the Year |

---

## Appendix: Design Direction

### Brand Identity Evolution
- **Current**: Baseball emoji logo, "TFL" header, dark liquid glass
- **Near-term**: Professional wordmark, sport-neutral but premium. Bold condensed typography. Named features ("The Gauntlet," "Draft Lab," "Trade Radar")
- **Long-term**: Each sport/format gets its own visual identity (colorway). Seasonal themes. Edition numbering ("Season 1 Inaugural")

### UI Priorities
1. Bento grid home dashboard (variable-sized tiles)
2. Inline AI signals (badges on player rows)
3. Spark-line mini charts on stats
4. Draft day special UI (distinct visual treatment)
5. Achievement trophy case on profiles
6. Per-league accent color theming

### Mobile Priorities
1. Bottom tab navigation (5 tabs)
2. Swipe-to-reveal actions on player rows
3. Pull-to-refresh with branded animation
4. iOS Live Activities for game scores (future)
