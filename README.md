# Apprentice Pulse

A SvelteKit application for tracking apprenticeship progress, integrated with Airtable.

## Setup

```sh
npm install
```

Create a `.env.local` file with your Airtable credentials:

```
AIRTABLE_API_KEY=your_api_key
AIRTABLE_BASE_ID_LEARNERS=your_base_id
AIRTABLE_BASE_ID_FEEDBACK=your_base_id
AUTH_SECRET=your_auth_secret
```

## Staff Access

To grant someone staff access (for managing events):

1. Add them as a **collaborator** in the Airtable workspace
2. Add a record for them in the **Staff - Apprentice Pulse** table (`tblJjn62ExE1LVjmx`), selecting their collaborator profile in the Staff Name field

Staff members can then log in using their collaborator email address.

## Development

```sh
npm run dev
```

## Testing Authentication (Development)

Since magic links are logged to the console (not emailed) during development, follow these steps to test login:

1. **Start the dev server** - `npm run dev`
2. **Call the login endpoint** - Use Postman or curl:
   ```sh
   curl -X POST http://localhost:5173/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "your@email.com"}'
   ```
3. **Copy the token** - Check the server terminal for the magic link URL containing the token
4. **Visit verify in your browser** - Navigate to `http://localhost:5173/api/auth/verify?token=YOUR_TOKEN`
5. **You're logged in** - The session cookie is set and you'll be redirected to `/`

**Important:** The verify step must be done in the browser (not Postman) because the session cookie needs to be set in the browser where you're viewing the app.

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

**Limitation:** `filterByFormula` still requires field **names**, not IDs. This is an Airtable API limitation. Document any field names used in formulas to track potential breaking changes.
