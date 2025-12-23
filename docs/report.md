# Creating the project (Boilerplate)
I created the boiler plate code, basic CI and deployment at the very beggining off the project (AP-3, AP-2, AP-8).
The idea is to have as soon as possible a "Hello world". In this context that would be a deployed sveltkit app that can read and write a value on Airtable.

# Testing from the very beginning

I created a test script (`scripts/test-airtable.ts`) to verify read and write access to Airtable before building any features. This script uses dotenv to load credentials from `.env.local` and tests creating and reading records from a dedicated test table.

The project uses Vitest with Playwright for browser-based component testing, with Playwright browsers installed automatically via a postinstall hook. At the moment test is boilerplate, so we are not really testing any real functionality


# Importing Airtable schema
To avoid possible errors when mapping the Airtable tables and fields I created the script `scripts/fetch-schema.ts`. This script uses the Airtable Metadata API to fetch the schema from configured bases (Learners and Learner Feedback). It presents an interactive checkbox prompt allowing selection of which tables to document, then generates a markdown file (`scripts/fetch-schema-output.md`) containing the field names and types for each selected table. This ensures the codebase stays in sync with the actual Airtable structure and serves as reference documentation for the team.

# Refereing Airtable Tables and fields by their IDs.
Instead of using their names, we will refer to tables and fields using their IDs, so there is no danger with users changing the name of a table and breaking the whole system


# Reusable Airtable Client with Factory Pattern

To prepare for the attendance tracking MVP and future features, I refactored the Airtable integration into a reusable module using the factory pattern. This allows the same business logic to work both in SvelteKit (server-side) and standalone scripts.

## Structure

- **`src/lib/airtable/airtable.ts`** - Core client with `createAirtableClient()` factory function. Contains all business logic and is framework-agnostic.
- **`src/lib/airtable/sveltekit-wrapper.ts`** - Thin wrapper that uses SvelteKit's `$env/static/private` to configure the client.

## Implementation

The factory pattern accepts credentials and returns an object with utility functions:

```typescript
export function createAirtableClient(apiKey: string, baseId: string) {
	Airtable.configure({ apiKey });
	const base = Airtable.base(baseId);

	async function getApprenticesByFacCohort(facCohort: string): Promise<Apprentice[]> {
		// ... implementation
	}

	return { getApprenticesByFacCohort };
}
```

**Usage in SvelteKit:**
```typescript
import { getApprenticesByFacCohort } from '$lib/airtable/sveltekit-wrapper';
const apprentices = await getApprenticesByFacCohort('FAC29');
```

**Usage in scripts:**
```typescript
import { createAirtableClient } from '../src/lib/airtable/airtable.ts';
const client = createAirtableClient(apiKey, baseId);
const apprentices = await client.getApprenticesByFacCohort('FAC29');
```

## Key decisions

- **Field IDs with `returnFieldsByFieldId: true`**: Makes the code resilient to field renames in Airtable
- **Typed `Apprentice` interface**: Provides type safety for consuming code
- **Lookup field handling**: Email is a lookup field that returns an array, handled with `emailLookup?.[0] ?? null`

This refactoring enables code reuse across the application while keeping environment-specific configuration isolated. [P5 - 75%] [D2 - 60%]


# Task Delegation and Team Coordination

During Sprint 02, I identified that certain tasks required permissions I did not have (e.g., Airtable schema modifications, access to specific bases). Rather than letting these become blockers, I added Jess to the Jira board and assigned the relevant tasks to her. This allowed me to clearly distinguish between work I could progress independently and work that was pending on others.

This approach improved visibility into the project status and helped me prioritise effectively, focusing on tasks within my control while maintaining a clear follow-up list for delegated items. [P1 - 50%] [P2 - 40%] [K2, K6]

# Authentication
We use jsonwebtoken library to authenticate learners and staff. This allows us to:
  * Generate the magic link token
  * Verify the token