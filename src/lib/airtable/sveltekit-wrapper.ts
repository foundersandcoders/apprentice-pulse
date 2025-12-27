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
import { createEventsClient } from './events.js';

export type { Apprentice } from './airtable.js';
export type { Event, EventFilters, CreateEventInput, UpdateEventInput } from '$lib/types/event.js';

const client = createAirtableClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);
const eventsClient = createEventsClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);

export const getApprenticesByFacCohort = client.getApprenticesByFacCohort;
export const findStaffByEmail = client.findStaffByEmail;
export const findApprenticeByEmail = client.findApprenticeByEmail;

// Events
export const listEvents = eventsClient.listEvents;
export const getEvent = eventsClient.getEvent;
export const createEvent = eventsClient.createEvent;
export const updateEvent = eventsClient.updateEvent;
export const deleteEvent = eventsClient.deleteEvent;
