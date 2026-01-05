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
import { createAttendanceClient } from './attendance.js';

export type { Apprentice, ApprenticeRecord, Cohort } from './airtable.js';
export type { Event, EventFilters, CreateEventInput, UpdateEventInput } from '$lib/types/event.js';
export type {
	Attendance,
	CreateAttendanceInput,
	CreateExternalAttendanceInput,
	UpdateAttendanceInput,
	ApprenticeAttendanceStats,
	CohortAttendanceStats,
	AttendanceSummary,
	AttendanceHistoryEntry,
} from '$lib/types/attendance.js';

const client = createAirtableClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);
const eventsClient = createEventsClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);
const attendanceClient = createAttendanceClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);

export const getApprenticesByFacCohort = client.getApprenticesByFacCohort;
export const findStaffByEmail = client.findStaffByEmail;
export const findApprenticeByEmail = client.findApprenticeByEmail;
export const getApprenticeByEmail = client.getApprenticeByEmail;
export const listCohorts = client.listCohorts;
export const getApprenticesByCohortId = client.getApprenticesByCohortId;
export const getApprenticesByIds = client.getApprenticesByIds;

// Events
export const listEvents = eventsClient.listEvents;
export const getEvent = eventsClient.getEvent;
export const getEventByCode = eventsClient.getEventByCode;
export const createEvent = eventsClient.createEvent;
export const updateEvent = eventsClient.updateEvent;
export const deleteEvent = eventsClient.deleteEvent;

// Attendance
export const hasUserCheckedIn = attendanceClient.hasUserCheckedIn;
export const hasExternalCheckedIn = attendanceClient.hasExternalCheckedIn;
export const createAttendance = attendanceClient.createAttendance;
export const createExternalAttendance = attendanceClient.createExternalAttendance;
export const updateAttendance = attendanceClient.updateAttendance;
export const getAttendanceForEvent = attendanceClient.getAttendanceForEvent;
export const getAttendanceByIds = attendanceClient.getAttendanceByIds;

// Attendance statistics
export const getApprenticeAttendanceStats = attendanceClient.getApprenticeAttendanceStats;
export const getCohortAttendanceStats = attendanceClient.getCohortAttendanceStats;
export const getAttendanceSummary = attendanceClient.getAttendanceSummary;
export const getApprenticeAttendanceHistory = attendanceClient.getApprenticeAttendanceHistory;
