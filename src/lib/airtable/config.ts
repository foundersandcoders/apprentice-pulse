/**
 * Airtable table and field IDs.
 * Reference: docs/schema.md
 */

// Tables
export const TABLES = {
	COHORTS: 'tbllAnSw8VPYFAa1a',
	APPRENTICES: 'tbl0HJM700Jmd5Oob',
	STAFF: 'tblJjn62ExE1LVjmx',
	EVENTS: 'tblkbskw4fuTq0E9p',
} as const;

// Fields - Cohorts
export const COHORT_FIELDS = {
	NUMBER: 'fldqWsDL2oqnonvZg',
	APPRENTICES: 'fldF2zEQCRaWglKl0',
} as const;

// Fields - Apprentices
export const APPRENTICE_FIELDS = {
	NAME: 'fldtvHx7pP5FgUWvh',
	STATUS: 'fldFP9b6CfhNzeVNQ',
	EMAIL: 'fldC3xdKGd96U0aoZ',
} as const;

// Fields - Staff
export const STAFF_FIELDS = {
	COLLABORATOR: 'fldHEHhQInmSdipn8', // singleCollaborator with { id, email, name }
} as const;

// Fields - Events
export const EVENT_FIELDS = {
	NAME: 'fldMCZijN6TJeUdFR',
	COHORT: 'fldcXDEDkeHvWTnxE', // multipleRecordLinks to Cohorts
	DATE_TIME: 'fld8AkM3EanzZa5QX', // dateTime (combined date and time)
	SURVEY: 'fld9XBHnCWBtZiZah', // url (optional survey form)
} as const;
