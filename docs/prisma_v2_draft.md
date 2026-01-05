# Prisma v2 Draft (Future Direction Only)

This file is a **draft / future redesign** and is **not** the current live schema used by the app.

Current live schema: `prisma/schema.prisma`

Purpose of this draft:

- Model OGBA as `League(code="OGBA")` and separate `Season(year=2025)` rows
- Normalize MLB teams as a first-class model
- Represent transactions as multi-line “asset moves” (Transaction + TransactionLine)
- Support richer roster history across effective date ranges

Do not implement this until:

- Current Prisma schema migrations are stable
- DB auth/migrations are reliable in your environment
- Period standings + roster modeling requirements are finalized

(When we are ready, we will create a migration plan from current v1 schema -> v2 schema.)
