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

The app uses **magic link authentication** with a single login page for all users:

### User Types

| Type | Validates Against | Landing Page |
|------|-------------------|--------------|
| Staff | Staff table (collaborator email) | `/admin` |
| Student | Apprentices table (learner email) | `/checkin` |
| External | Staff table (external access fields) | `/admin` |

### How It Works

1. User enters email at `/login`
2. Server checks Staff table first, then external access fields, then Apprentices table
3. JWT token generated (15-minute expiry) and emailed via Resend
4. User clicks link → token verified → session cookie set (90-day expiry)
5. User redirected based on type: staff/external → `/admin`, students → `/checkin`

### Route Protection

The app uses SvelteKit hooks (`src/hooks.server.ts`) for centralized route protection:

- `/admin/*` → Staff only (redirects students to `/checkin`)
- `/checkin` → Any authenticated user (staff or student)
- `/login` → Redirects authenticated users to their landing page
- `/` → Redirects to `/login` (unauthenticated) or landing page (authenticated)

### Check-in Access

Both staff and students can access `/checkin`. The system determines check-in behavior based on apprentice record:

| User | Apprentice Link? | Events Shown | Attendance Method | Absent Button |
|------|------------------|--------------|-------------------|---------------|
| Student | N/A (is apprentice) | Cohort + public | Linked to apprentice ID | Yes |
| Staff | Yes (linked) | Cohort + public | Linked to apprentice ID | Yes |
| Staff | No | Public only | External (uses session email) | No |

See [Staff Who Are Also Apprentices](#staff-who-are-also-apprentices) for setup instructions.

### Adding Staff Members

1. Add them as a **collaborator** in the Airtable workspace
2. Add a record in the **Staff - Apprentice Pulse** table, selecting their collaborator profile
3. They can now log in at `/login` using their collaborator email

### Adding External Staff Access

External staff are people who need login access to view attendance data but are not regular staff members or apprentices. Examples include external trainers, consultants, or partner organization staff.

To grant external staff access:

1. **In the Staff - Apprentice Pulse table**, find any existing staff record (or create a dummy one)
2. **Add the external person's email** to the `Attendace access` field (this field can contain multiple emails, one per line)
3. **Add their name** to the `Name - Attendance access` field (this should match the order of emails in step 2)

**Example setup:**
- `Attendace access` field: `external.trainer@company.com`
- `Name - Attendance access` field: `External Trainer`

**How it works:**
- External staff can log in at `/login` using their email
- They receive the same magic link authentication as regular staff
- They have **full admin access** - same permissions as regular staff members
- No Airtable workspace collaboration required

**Multiple external users:**
You can add multiple external users to the same staff record by putting each email on a new line:
- `Attendace access` field:
  ```
  trainer1@company.com
  trainer2@company.com
  ```
- `Name - Attendance access` field:
  ```
  External Trainer 1
  External Trainer 2
  ```

### Staff Who Are Also Apprentices

Some staff members may also be apprentices (e.g., apprentice coaches). These users need to:
- Log in as **staff** to access admin features
- Check in as an **apprentice** to have attendance tracked against their apprentice record

The system supports this via the **Apprentice Link** field in the Staff table:

1. In the **Staff - Apprentice Pulse** table, link the staff record to their **Apprentice** record using the `Apprentice Link` field
2. The `Learner email` lookup field will automatically populate from the linked apprentice

**How it works:**

When a staff member accesses the check-in page:
1. System first tries to find an apprentice record matching their staff email
2. If not found, it checks if the staff record has a linked apprentice (via `Learner email` lookup)
3. If a linked apprentice is found, the staff member gets the full apprentice check-in experience:
   - Sees their cohort events (not just public events)
   - Can mark themselves as "Absent"
   - Attendance is recorded against their apprentice record

This allows staff to maintain a single login (their staff email) while still being tracked as apprentices for attendance purposes.

## Development

```sh
npm run dev
```

## Testing Authentication (Development)

In development, you can test login using the UI or via curl:

### Via UI
1. Start the dev server: `npm run dev`
2. Go to `/login`
3. Enter an email that exists in either the Staff or Apprentices table
4. Check your email for the magic link

### Via curl
```sh
curl -X POST http://localhost:5173/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com"}'
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

Event types are now managed dynamically through Airtable's "Event types - Apprentice Pulse" table. This provides:

- **Single source of truth**: Event types defined in Airtable only
- **No code deployments**: Add/remove event types without touching code
- **Flexible management**: Administrators can manage types directly in Airtable
- **Automatic validation**: API endpoints validate against current Airtable data

Event types are cached for performance (5-minute cache) and include automatic color assignment for UI consistency.

### Default Values

Default values for event creation are now managed dynamically through Airtable's "Event types - Apprentice Pulse" table. Each event type can have its own default survey URL, providing more flexibility than hardcoded values.
