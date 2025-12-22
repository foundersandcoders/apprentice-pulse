# Creating the project (Boilerplate)
I created the boiler plate code, basic CI and deployment at the very beggining off the project (AP-3, AP-2, AP-8).
The idea is to have as soon as possible a "Hello world". In this context that would be a deployed sveltkit app that can read and write a value on Airtable.

# Testing from the very beginning

I created a test script (`scripts/test-airtable.ts`) to verify read and write access to Airtable before building any features. This script uses dotenv to load credentials from `.env.local` and tests creating and reading records from a dedicated test table.

The project uses Vitest with Playwright for browser-based component testing, with Playwright browsers installed automatically via a postinstall hook. At the moment test is boilerplate, so we are not really testing any real functionality


# Importing Airtable schema
To avoid possible errors when mapping the Airtable tables and fields I created the script `scripts/fetch-schema.ts`. This script uses the Airtable Metadata API to fetch the schema from configured bases (Learners and Learner Feedback). It presents an interactive checkbox prompt allowing selection of which tables to document, then generates a markdown file (`scripts/fetch-schema-output.md`) containing the field names and types for each selected table. This ensures the codebase stays in sync with the actual Airtable structure and serves as reference documentation for the team.