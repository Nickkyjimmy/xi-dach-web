# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

XiDach VN is a Vietnamese Blackjack multiplayer game with real-time player interactions, QR code-based scan verification, and a Supabase backend. Hosts manage game sessions where players scan QR codes to record round results.

## Commands

```bash
bun install              # Install dependencies
bun dev                  # Start development server (localhost:3000)
bun build                # Production build
bun lint                 # Run ESLint
bunx prisma migrate dev  # Run database migrations
bunx prisma generate     # Regenerate Prisma client
bunx shadcn@latest add [component]  # Add shadcn/ui component
```

## Architecture

### Tech Stack
- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- Supabase (PostgreSQL + Realtime), Prisma ORM with @prisma/adapter-pg
- TanStack Query for server state, Zustand available for client state
- html5-qrcode (scanning), qrcode (generation)

### Key Routes
```
/                        → Home (Create/Join game)
/join?pin=XXXXXX         → Multi-step join flow
/lobby/[id]              → Host lobby (QR display, player list)
/game/[id]/host          → Host control panel (active game)
/game/[id]/player?id=... → Player QR display
/game/[id]/waiting       → Waiting room (pre-game)
```

### Database Models (prisma/schema.prisma)
- **Game**: Session container with PIN, status (LOBBY→ACTIVE→FINISHED), bettingValue
- **Player**: Participants with name, balance, status, isHost flag
- **Round**: Individual rounds within a game
- **RoundResult**: Player outcome per round (WIN/LOSE/DRAW/X2)
- **Transaction**: Financial ledger tracking all balance changes

### Server Actions
All game logic lives in `/src/app/actions/game-actions.ts`:
- `createGame()`, `joinGameWithNickname()`, `startGame()`
- `submitScanResult()`, `finishRound()`, `nextRound()`, `endGame()`
- Uses Prisma transactions for atomic round completion

### Real-time Pattern
```typescript
const channel = supabase.channel('name')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'Table',
    filter: 'gameId=eq.XXX'
  }, () => fetchGameData())  // Manual fetch on change
  .subscribe()

// Cleanup: supabase.removeChannel(channel)
```

### Data Fetching
- Host/Player pages fetch directly from Supabase SDK (Vercel free tier optimization)
- Join flow uses API endpoint `/api/game/[id]`
- No continuous polling; event-driven via Realtime

### QR Code Flow
- Player QR encodes: playerId (raw string)
- Join QR encodes: Full URL with pin parameter
- Scanner in modal with manual input fallback

## Game State Flow

```
LOBBY → Host clicks "Start Game" → ACTIVE (Round 1 created)
  → Host scans players (WIN/DRAW/X2)
  → "END ROUND & SUM UP" → finishRound() creates Transactions
  → LEADERBOARD → "Next Round" → nextRound()
  → ... repeat → "End Game" → FINISHED
```

## Development Utilities

Home page has colored buttons for testing:
- `devSetupHost()`: Creates active game, returns to host page
- `devSetupPlayer()`: Joins/creates game as bot player
- `simulateTestPlayer()`: Adds test bot with auto-WIN result

## Environment Variables

```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Important Notes

- Auth is stubbed: `hostId = "temp-host-id"` hardcoded
- Player persistence via localStorage (playerId, gameId)
- Realtime requires manual fetch after notification (payload doesn't contain full data)
- RoundResult has unique constraint on [roundId, playerId]
- Always call `supabase.removeChannel()` on component unmount
