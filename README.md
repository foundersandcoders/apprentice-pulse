# Apprentice Pulse

A SvelteKit application for tracking apprenticeship progress, integrated with Airtable.

## Setup

```sh
npm install
```

Create a `.env.local` file with your credentials:

```
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID=your_base_id
RESEND_API_KEY=your_resend_key
RESEND_FROM_EMAIL=App Name <noreply@yourdomain.com>
AUTH_SECRET=your_auth_secret_min_32_chars
```

## Authentication

The app uses **magic link authentication** with separate login flows for staff and students:

### User Types

| Type | Login Page | Validates Against | Default Redirect |
|------|------------|-------------------|------------------|
| Staff | `/admin/login` | Staff table (collaborator email) | `/admin` |
| Student | `/login` | Apprentices table (learner email) | `/` |

### How It Works

1. User enters email on the appropriate login page
2. Server validates email exists in the corresponding Airtable table
3. JWT token generated (15-minute expiry) and emailed via Resend
4. User clicks link → token verified → session cookie set (90-day expiry)
5. User redirected to appropriate dashboard

### Route Protection

The app uses SvelteKit hooks (`src/hooks.server.ts`) for centralized route protection:

- `/admin/*` → Staff only (redirects students to `/`)
- `/checkin` → Any authenticated user
- `/login`, `/admin/login` → Redirects away if already authenticated

### Adding Staff Members

1. Add them as a **collaborator** in the Airtable workspace
2. Add a record in the **Staff - Apprentice Pulse** table, selecting their collaborator profile
3. They can now log in at `/admin/login` using their collaborator email

## Development

```sh
npm run dev
```

## Testing Authentication (Development)

In development, you can test login using the UI or via curl:

### Via UI
1. Start the dev server: `npm run dev`
2. Go to `/login` (students) or `/admin/login` (staff)
3. Enter an email that exists in the appropriate Airtable table
4. Check your email for the magic link

### Via curl
```sh
# Staff login
curl -X POST http://localhost:5173/api/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email": "staff@example.com"}'

# Student login
curl -X POST http://localhost:5173/api/auth/student/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com"}'
```

Then click the magic link in your email, or manually visit:
`http://localhost:5173/api/auth/verify?token=YOUR_TOKEN`

**Note:** The verify step must be done in the browser so the session cookie is set correctly.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm run lint` | Run ESLint |
| `npx tsx scripts/fetch-schema.ts` | Fetch Airtable schema |
| `npx tsx scripts/test-airtable.ts` | Test Airtable connection |

## Tech Stack

- SvelteKit
- TailwindCSS
- Airtable
- Vitest + Playwright

## Airtable Integration

We reference Airtable tables and fields by their **IDs** rather than names to prevent breakage when users rename things.

Use `returnFieldsByFieldId: true` in select queries to access fields by ID:

```typescript
const records = await table
  .select({
    filterByFormula: `{Field Name} = "value"`,
    returnFieldsByFieldId: true,
  })
  .all();

const value = record.get('fldXXXXXXXXXXXXXX'); // field ID
```

**Limitation:** `filterByFormula` still requires field **names**, not IDs. This is an Airtable API limitation.

### Field Names Used in Formulas

The following field names are used in `filterByFormula` queries. **Renaming these fields in Airtable will break the app:**

| Table | Field Name | Used In |
|-------|------------|---------|
| Apprentices | `Learner email` | `findApprenticeByEmail()` |
| Cohorts | `FAC Cohort` | `getApprenticesByFacCohort()` |
| Events | `FAC Cohort` | `listEvents()` cohort filter |
| Events | `Date Time` | `listEvents()` date range filter |

### Fetching Schema IDs

When adding new functionality or when Airtable schema changes, use the schema fetch script to get the correct table and field IDs:

```sh
npx tsx scripts/fetch-schema.ts
```

This script:
1. Connects to your configured Airtable bases
2. Presents an interactive prompt to select which tables to include
3. Outputs a timestamped markdown file (e.g., `scripts/schema-2025-01-15-10-30-00.md`) with all table IDs and field IDs

**Always use this script** to get IDs rather than copying them manually from the Airtable UI. This ensures accuracy and provides documentation of the schema at that point in time.

The generated schema file can be used to update `src/lib/airtable/config.ts` with new field IDs.

### Event Types

Event types are defined as a single source of truth in `src/lib/types/event.ts`:

```typescript
export const EVENT_TYPES = ['Regular class', 'Workshop', 'Hackathon'] as const;
export type EventType = typeof EVENT_TYPES[number];
```

To add a new event type, update the `EVENT_TYPES` array - all forms and validation will automatically use the new values.

### Default Values

Default values used in forms are stored in `src/lib/airtable/config.ts` under `DEFAULTS`:

| Key | Description |
|-----|-------------|
| `SURVEY_URL` | Default survey URL pre-filled when creating events |

To change the default survey URL, update `DEFAULTS.SURVEY_URL` in the config file.
