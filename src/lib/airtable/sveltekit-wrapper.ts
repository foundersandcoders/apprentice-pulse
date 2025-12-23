import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS } from '$env/static/private';
import { createAirtableClient } from './airtable.js';

export type { Apprentice } from './airtable.js';

const client = createAirtableClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);

export const getApprenticesByFacCohort = client.getApprenticesByFacCohort;
