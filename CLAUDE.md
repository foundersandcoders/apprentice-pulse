# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Preferences

- **Small iterations**: Make one small change at a time, explain it, and wait for approval before proceeding
- **Alignment**: Features, branches, and Jira tasks must always be aligned (e.g., branch `feature/ap-15-role-based-route-protection` for Jira ticket AP-15)
- **Consistency**: Keep code consistent with existing patterns in the codebase
- **Proven solutions**: Use robust, well-established approaches - no experimental or "clever" solutions
- **Report updates**: When updating `docs/report.md`, check `docs/Assesment-criteria.md` and `docs/planning/ksbs.md`. Try to phrase content to align with assessment criteria where natural, but never force it - not every change needs to match a criterion. The report tracks all interesting technical decisions.
- **No AI attribution**: Never add "Co-Authored-By" or "Generated with Claude" messages to commits or PRs


## Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run all tests (Vitest)
npm run test:unit    # Run tests in watch mode
npm run lint         # Run ESLint
npm run check        # TypeScript type checking
```

Run a single test file:
```bash
npx vitest run src/lib/server/auth.spec.ts
```

## Architecture

Apprentice Pulse is a SvelteKit application that automates attendance tracking, progress reviews, and early intervention alerts for FAC apprentices. It sits on top of existing Airtable bases.

### Key Layers

- **Frontend**: Mobile-first PWA for student check-in (NFC/QR → magic link auth → one-tap attendance)
- **API Routes**: `/api/auth/*`, `/api/checkin`, `/api/events`, `/api/webhooks`
- **Cron Jobs**: Attendance chase, survey reminders, EPA alerts (Vercel Cron)
- **External Services**: Airtable (database), Resend (email), Discord (webhooks)

### Airtable Integration

Tables and fields are referenced by **IDs** (not names) to prevent breakage when users rename things. IDs are centralized in `src/lib/airtable/config.ts`.

```typescript
import { TABLES, APPRENTICE_FIELDS } from '$lib/airtable/config';
```

Use `returnFieldsByFieldId: true` in queries. Note: `filterByFormula` still requires field **names** (Airtable limitation).

Schema documentation: `docs/schema.md`

### Authentication

Magic link auth with JWT tokens (15-min expiry). Sessions stored as HTTP-only cookies (90 days).

- `src/lib/server/auth.ts` - Token generation/verification
- `src/lib/server/session.ts` - Cookie helpers (get/set/clear)
- `src/hooks.server.ts` - Route protection middleware

User types: `'staff'` | `'student'`. Route protection:
- `/admin/*` → staff only
- `/checkin` → any authenticated user
- `/login` → redirects if already authenticated

### Code Style

ESLint with `@stylistic/eslint-plugin`:
- Tabs for indentation
- Single quotes
- Semicolons required
- Brace style: `else`/`catch` on new line after closing brace

Svelte 5 runes syntax (`$state`, `$derived`, `$props`). Use `$app/state` not `$app/stores`.

**DOM element references** must use `$state` - never use plain variables:
```typescript
// Correct
let container = $state<HTMLDivElement | null>(null);

// Wrong - causes "non_reactive_update" warning
let container: HTMLDivElement;
```

## Testing Auth in Development

Magic links log to console (not emailed). To test:

1. Start dev server: `npm run dev`
2. POST to login: `curl -X POST http://localhost:5173/api/auth/login -H "Content-Type: application/json" -d '{"email": "your@email.com"}'`
3. Copy token from server console
4. Visit in browser: `http://localhost:5173/api/auth/verify?token=YOUR_TOKEN`
