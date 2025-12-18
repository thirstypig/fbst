// schema.prisma
// FBST / OGBA – League, Teams, Players, Rosters, Transactions

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------------------------------------------------------
// Enums
// ---------------------------------------------------------

enum SeasonState {
  PRE_DRAFT
  IN_SEASON
  COMPLETED
}

enum RosterStatus {
  ACTIVE
  IL
  RESERVE
  FA
}

enum TransactionType {
  ADD
  DROP
  TRADE
  COMMISH_ADJUST
  KEEPER
}

enum UserRole {
  COMMISSIONER
  OWNER
  VIEW_ONLY
}

enum TeamOwnerRole {
  PRIMARY
  COOWNER
  GM
}

// ---------------------------------------------------------
// Core league / season
// ---------------------------------------------------------

model League {
  id        String   @id @default(uuid())
  code      String   @unique          // e.g. "OGBA"
  name      String                   // e.g. "Old Guys Baseball Association"
  settings  Json?                    // scoring, period config, etc.

  seasons   Season[]
  teams     FantasyTeam[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Season {
  id        String   @id @default(uuid())

  league    League   @relation(fields: [leagueId], references: [id])
  leagueId  String

  year      Int
  state     SeasonState

  rosters   SeasonRoster[]
  txns      Transaction[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([leagueId, year])
}

// ---------------------------------------------------------
// Fantasy teams & MLB teams
// ---------------------------------------------------------

model FantasyTeam {
  id           String   @id @default(uuid())

  league       League   @relation(fields: [leagueId], references: [id])
  leagueId     String

  code         String   // 3-letter OGBA code: DDG, LDY, etc.
  name         String   // Full team name: "Dodger Dawgs"
  ownerDisplay String?  // "James Chang", etc.

  isActive     Boolean  @default(true)

  // Relationships
  rosters      SeasonRoster[]
  fromLines    TransactionLine[] @relation("TxnLineFromTeam")
  toLines      TransactionLine[] @relation("TxnLineToTeam")
  owners       TeamOwner[]

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([leagueId, code])
}

model MlbTeam {
  id        String   @id             // 3-letter MLB code: LAD, NYM, etc.
  name      String                   // "Los Angeles Dodgers"
  city      String?
  league    String?                  // "NL", "AL"
  division  String?                  // "West", etc.

  players   Player[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ---------------------------------------------------------
// Players
// ---------------------------------------------------------

model Player {
  id          String   @id @default(uuid())
  mlbId       Int      @unique        // MLB API id
  fullName    String               // "Will Smith"
  primaryPos  String               // normalized: C, 1B, 2B, 3B, SS, OF, DH, P

  mlbTeam     MlbTeam? @relation(fields: [mlbTeamId], references: [id])
  mlbTeamId   String?

  bats        String?  // L/R/S
  throws      String?  // L/R

  meta        Json?    // raw MLB payload or extra

  rosters     SeasonRoster[]
  txnLines    TransactionLine[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([mlbId])
}

// ---------------------------------------------------------
// Rosters
// ---------------------------------------------------------

model SeasonRoster {
  id        String   @id @default(uuid())

  season    Season   @relation(fields: [seasonId], references: [id])
  seasonId  String

  team      FantasyTeam @relation(fields: [teamId], references: [id])
  teamId    String

  player    Player   @relation(fields: [playerId], references: [id])
  playerId  String

  status    RosterStatus

  acquiredTxn   Transaction? @relation("RosterAcquiredTxn", fields: [acquiredTxnId], references: [id])
  acquiredTxnId String?

  droppedTxn    Transaction? @relation("RosterDroppedTxn", fields: [droppedTxnId], references: [id])
  droppedTxnId  String?

  /// First date (inclusive) where this ownership applies.
  effectiveFrom DateTime

  /// Last date (inclusive) where this ownership applies.
  /// NULL means "still owned".
  effectiveTo   DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([seasonId, teamId])
  @@index([seasonId, playerId])
}

// ---------------------------------------------------------
// Transactions
// ---------------------------------------------------------

model Transaction {
  id           String   @id @default(uuid())

  season       Season   @relation(fields: [seasonId], references: [id])
  seasonId     String

  type         TransactionType
  executedAt   DateTime         // when commissioner clicked "Confirm"
  effectiveDate DateTime        // date whose stats should belong to new team

  createdBy    User?    @relation(fields: [createdById], references: [id])
  createdById  String?

  note         String?          // free text note

  lines        TransactionLine[]

  acquiredRosters SeasonRoster[] @relation("RosterAcquiredTxn")
  droppedRosters  SeasonRoster[] @relation("RosterDroppedTxn")

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([seasonId, effectiveDate])
}

model TransactionLine {
  id            String        @id @default(uuid())

  transaction   Transaction   @relation(fields: [transactionId], references: [id])
  transactionId String

  player        Player        @relation(fields: [playerId], references: [id])
  playerId      String

  fromTeam      FantasyTeam?  @relation("TxnLineFromTeam", fields: [fromTeamId], references: [id])
  fromTeamId    String?

  toTeam        FantasyTeam?  @relation("TxnLineToTeam", fields: [toTeamId], references: [id])
  toTeamId      String?

  isPrimaryAsset Boolean      @default(true)
  meta          Json?         // future: auction $, pick rights, etc.

  createdAt     DateTime @default(now())
}

// ---------------------------------------------------------
// Users / owners (lightweight; commissioner + future owners)
// ---------------------------------------------------------

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      UserRole @default(OWNER)

  teamOwnerships TeamOwner[]
  createdTxns    Transaction[] @relation("UserTransactions")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model TeamOwner {
  id        String      @id @default(uuid())

  user      User        @relation(fields: [userId], references: [id])
  userId    String

  team      FantasyTeam @relation(fields: [teamId], references: [id])
  teamId    String

  role      TeamOwnerRole @default(PRIMARY)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, teamId])
}
