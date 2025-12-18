# Creating the project (Boilerplate)
I created the boiler plate code, basic CI and deployment at the very beggining off the project (AP-3, AP-2, AP-8).
The idea is to have as soon as possible a "Hello world". In this context that would be a deployed sveltkit app that can read and write a value on Airtable.

# Testing from the very beginning

I created a test script (`scripts/test-airtable.ts`) to verify read and write access to Airtable before building any features. This script uses dotenv to load credentials from `.env.local` and tests creating and reading records from a dedicated test table.

The project uses Vitest with Playwright for browser-based component testing, with Playwright browsers installed automatically via a postinstall hook. At the moment test is boilerplate, so we are not really testing any real functionality