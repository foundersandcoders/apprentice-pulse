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
	ATTENDANCE: 'tblkDbhJcuT9TTwFc',
	TERMS: 'tbl4gkcG92Bc8gFU7',
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
	COHORT: 'fldbSlfS7cQTl2hpF', // multipleRecordLinks to Cohorts
} as const;

// Fields - Staff
export const STAFF_FIELDS = {
	COLLABORATOR: 'fldHEHhQInmSdipn8', // singleCollaborator with { id, email, name }
} as const;

// Fields - Events
export const EVENT_FIELDS = {
	NAME: 'fldMCZijN6TJeUdFR',
	COHORT: 'fldcXDEDkeHvWTnxE', // multipleRecordLinks to Cohorts
	DATE_TIME: 'fld8AkM3EanzZa5QX', // dateTime (start time)
	END_DATE_TIME: 'fldpBorZFMxhgNhNR', // dateTime (end time)
	EVENT_TYPE: 'fldo7fwAsFhkA1icC', // singleSelect (Regular Class, Workshop, Hackathon)
	SURVEY: 'fld9XBHnCWBtZiZah', // url (optional survey form)
	ATTENDANCE: 'fldcPf53fVfStFZsa', // multipleRecordLinks to Attendance (reverse link)
	NAME_DATE: 'fld7POykodV0LGsg1', // formula (display name)
	PUBLIC: 'fldatQzdAo8evWlNc', // checkbox (visible to all on check-in page)
	CHECK_IN_CODE: 'fldKMWSFmYONkvYMK', // number - field name is "Number" (4-digit code for external attendees)
} as const;

// Fields - Attendance
export const ATTENDANCE_FIELDS = {
	ID: 'fldGdpuw6SoHkQbOs', // autoNumber
	APPRENTICE: 'fldOyo3hlj9Ht0rfZ', // multipleRecordLinks to Apprentices
	EVENT: 'fldiHd75LYtopwyN9', // multipleRecordLinks to Events
	CHECKIN_TIME: 'fldvXHPmoLlEA8EuN', // dateTime
	STATUS: 'fldew45fDGpgl1aRr', // singleSelect (Present/Not Check-in/Late/Excused/Absent)
	EXTERNAL_NAME: 'fldIhZnMxfjh9ps78', // singleLineText (for non-registered attendees)
	EXTERNAL_EMAIL: 'fldHREfpkx1bGv3K3', // email (for non-registered attendees)
} as const;

// Fields - Terms
export const TERM_FIELDS = {
	NAME: 'fldrnRBnBuHbscSy7', // singleLineText
	STARTING_DATE: 'fldlzwlqYo7rMMSDp', // date
	END_DATE: 'fldJKhrzNZNCD6SYY', // date
} as const;

// Defaults
export const DEFAULTS = {
	SURVEY_URL: 'https://airtable.com/app75iT6Or0Rya1KE/tblkbskw4fuTq0E9p/viwMPduDi2Cl0Bwa3/rec3vWwKLpAycDCSL/fld9XBHnCWBtZiZah?copyLinkToCellOrRecordOrigin=gridView',
} as const;
