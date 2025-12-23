/**
 * Airtable table and field IDs.
 * Reference: docs/schema.md
 */

// Tables
export const TABLES = {
	COHORTS: 'tbllAnSw8VPYFAa1a',
	APPRENTICES: 'tbl0HJM700Jmd5Oob',
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
