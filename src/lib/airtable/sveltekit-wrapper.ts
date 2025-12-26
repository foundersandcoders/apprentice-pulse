/**
 * SvelteKit wrapper for the Airtable client.
 *
 * This module pre-configures the Airtable client with credentials from SvelteKit's
 * environment variables ($env/static/private), providing clean imports for use in
 * SvelteKit routes and server files.
 *
 * @example
 * import { findUserByEmail } from '$lib/airtable/sveltekit-wrapper';
 * const user = await findUserByEmail('test@example.com');
 */

import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS } from '$env/static/private';
import { createAirtableClient } from './airtable.js';

export type { Apprentice } from './airtable.js';

const client = createAirtableClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);

export const getApprenticesByFacCohort = client.getApprenticesByFacCohort;
/** @deprecated Use findStaffByEmail or findApprenticeByEmail instead */
export const findUserByEmail = client.findUserByEmail;
export const findStaffByEmail = client.findStaffByEmail;
export const findApprenticeByEmail = client.findApprenticeByEmail;
