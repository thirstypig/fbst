---
title: "Multi-League Support + Public League Discovery"
type: feat
status: active
date: 2026-04-08
---

# Multi-League Support + Public League Discovery

## Overview

Enable users to participate in multiple leagues simultaneously and discover/join public leagues. Must follow the feature module pattern with strict isolation — no cross-league data leaks.

## Current State

- **LeagueContext** already supports league switching: `leagueId`, `setLeagueId`, `leagues` list
- **Franchise model** exists: `Franchise` → `FranchiseMembership` → `League`
- **LeagueMembership** model tracks user→league relationship with roles
- **League.isPublic** and **League.publicSlug** fields exist in schema (added during league creation)
- **League switching** works in the sidebar dropdown (OGBA 2025 / OGBA 2026)
- **User can be in multiple leagues** via separate `LeagueMembership` records

## What's Needed

### Phase 1: Public League Directory (new feature module)

**New module: `server/src/features/discovery/` + `client/src/features/discovery/`**

```
server/src/features/discovery/
├── routes.ts          # GET /api/discovery/leagues, GET /api/discovery/:slug
├── index.ts
client/src/features/discovery/
├── pages/
│   ├── LeagueDirectory.tsx    # Browse public leagues
│   └── LeagueDetail.tsx       # View league info before joining
├── api.ts
├── index.ts
```

**Endpoints:**
- `GET /api/discovery/leagues` — list all public leagues (no auth required for browsing)
- `GET /api/discovery/leagues/:slug` — league detail page (teams, season, rules)
- `POST /api/discovery/leagues/:slug/join` — request to join (requires auth)

**Data isolation:** These endpoints ONLY return public-safe data. No team budgets, no roster details, no waiver claims. Just: league name, team count, commissioner name, season year, scoring format.

### Phase 2: League Join Flow

**Flow:**
1. User browses `/discover` → sees list of public leagues
2. Clicks league → sees team names, rules summary, commissioner contact
3. Clicks "Request to Join" → creates a `LeagueInvite` with status `PENDING`
4. Commissioner receives notification → approves/rejects in Commissioner panel
5. On approval → `LeagueMembership` created, user sees league in sidebar dropdown

**Existing infrastructure to reuse:**
- `LeagueInvite` model already exists (used for email invites)
- `commissioner/routes.ts` already has invite management
- `auth/routes.ts` already auto-accepts invites on login

### Phase 3: Multi-League Data Isolation

**Critical isolation rules:**

1. **Every API endpoint must scope by `leagueId`** — no global queries
2. **`requireLeagueMember` middleware** gates all league-specific data
3. **LeagueContext** provides the active `leagueId` — all client API calls include it
4. **No cross-league roster visibility** — a user's team in League A cannot see League B data
5. **Player table is shared** — `Player` records are league-agnostic (MLB data). Only `Roster`, `Team`, `Trade`, `WaiverClaim` are league-scoped.
6. **AiInsight** is scoped by `leagueId` — no cross-league digest or insights

**Audit checklist (before launch):**
- [ ] Every `prisma.team.findMany` includes `where: { leagueId }`
- [ ] Every `prisma.roster.findMany` includes league scoping (via team relation)
- [ ] No endpoint returns data from a league the user isn't a member of
- [ ] League switching in sidebar correctly refreshes all page data
- [ ] Cron jobs scope their work by league (don't mix league data)

### Phase 4: League Creation Self-Service

**Currently:** League creation is admin-only (`POST /api/admin/leagues`).
**Target:** Commissioners can create leagues themselves.

**New module: `client/src/features/league-setup/`**

```
client/src/features/league-setup/
├── pages/
│   └── CreateLeague.tsx       # Step-by-step league creation wizard
├── components/
│   ├── RulesEditor.tsx        # Already exists in leagues/
│   └── InviteTeamOwners.tsx   # Email invite form
├── api.ts
```

**Flow:**
1. User clicks "Create League" from sidebar or discover page
2. Wizard: Name → Scoring Format → Roster Size → Rules → Invite Team Owners
3. Creates `League` + `Franchise` + initial `LeagueMembership` (commissioner role)
4. Generates invite codes or sends email invites via Resend

## Feature Module Isolation Checklist

Each new module MUST:
- [ ] Have its own `routes.ts` with named export router
- [ ] Mount in `server/src/index.ts` with a unique prefix
- [ ] Have its own `api.ts` client using `fetchJsonApi`
- [ ] Import pages in `App.tsx` from `./features/<name>/pages/<Page>`
- [ ] NOT import from other features' pages (components OK, documented in CLAUDE.md)
- [ ] Have proper auth middleware (`requireAuth` on write, `requireLeagueMember` on league data)
- [ ] Be listed in CLAUDE.md feature module table

## Dependencies

```
discovery → leagues (league data), auth (membership)
league-setup → leagues (rules), commissioner (invite flow), franchises (org creation)
```

## Acceptance Criteria

- [ ] Public leagues browsable without auth at /discover
- [ ] Join request flow works end-to-end
- [ ] User can switch between leagues in sidebar
- [ ] All data scoped by leagueId — no cross-league leaks
- [ ] New feature modules follow the established pattern
- [ ] CLAUDE.md updated with new modules and cross-feature deps
