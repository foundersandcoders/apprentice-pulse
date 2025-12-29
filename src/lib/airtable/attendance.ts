import Airtable from 'airtable';

import { TABLES, ATTENDANCE_FIELDS, EVENT_FIELDS } from './config.js';
import type {
	Attendance,
	CreateAttendanceInput,
	CreateExternalAttendanceInput,
} from '../types/attendance.js';

export function createAttendanceClient(apiKey: string, baseId: string) {
	Airtable.configure({ apiKey });
	const base = Airtable.base(baseId);
	const attendanceTable = base(TABLES.ATTENDANCE);
	const eventsTable = base(TABLES.EVENTS);

	/**
	 * Check if an event exists and return its public status
	 */
	async function getEventInfo(eventId: string): Promise<{ exists: boolean; isPublic: boolean }> {
		const records = await eventsTable
			.select({
				filterByFormula: `RECORD_ID() = "${eventId}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (records.length === 0) {
			return { exists: false, isPublic: false };
		}

		const isPublic = (records[0].get(EVENT_FIELDS.PUBLIC) as boolean) ?? false;
		return { exists: true, isPublic };
	}

	/**
	 * Check if a registered user has already checked in to an event
	 */
	async function hasUserCheckedIn(eventId: string, apprenticeId: string): Promise<boolean> {
		const records = await attendanceTable
			.select({
				filterByFormula: `AND({${ATTENDANCE_FIELDS.EVENT}} = "${eventId}", {${ATTENDANCE_FIELDS.APPRENTICE}} = "${apprenticeId}")`,
				maxRecords: 1,
			})
			.all();

		return records.length > 0;
	}

	/**
	 * Check if an external email has already checked in to an event
	 */
	async function hasExternalCheckedIn(eventId: string, email: string): Promise<boolean> {
		const records = await attendanceTable
			.select({
				filterByFormula: `AND({${ATTENDANCE_FIELDS.EVENT}} = "${eventId}", LOWER({External Email}) = LOWER("${email}"))`,
				maxRecords: 1,
			})
			.all();

		return records.length > 0;
	}

	/**
	 * Create attendance record for a registered user
	 * @throws Error if event doesn't exist or user already checked in
	 */
	async function createAttendance(input: CreateAttendanceInput): Promise<Attendance> {
		// Validate event exists
		const eventInfo = await getEventInfo(input.eventId);
		if (!eventInfo.exists) {
			throw new Error('Event not found');
		}

		// Prevent duplicate check-in
		const alreadyCheckedIn = await hasUserCheckedIn(input.eventId, input.apprenticeId);
		if (alreadyCheckedIn) {
			throw new Error('User has already checked in to this event');
		}

		const fields: Airtable.FieldSet = {
			[ATTENDANCE_FIELDS.EVENT]: [input.eventId],
			[ATTENDANCE_FIELDS.APPRENTICE]: [input.apprenticeId],
			[ATTENDANCE_FIELDS.CHECKIN_TIME]: new Date().toISOString(),
			[ATTENDANCE_FIELDS.STATUS]: 'Present',
		};

		const record = await attendanceTable.create(fields);

		return {
			id: record.id,
			eventId: input.eventId,
			apprenticeId: input.apprenticeId,
			checkinTime: fields[ATTENDANCE_FIELDS.CHECKIN_TIME] as string,
			status: 'Present',
		};
	}

	/**
	 * Create attendance record for an external (non-registered) user
	 * @throws Error if event doesn't exist, is not public, or email already checked in
	 */
	async function createExternalAttendance(input: CreateExternalAttendanceInput): Promise<Attendance> {
		// Validate event exists and is public
		const eventInfo = await getEventInfo(input.eventId);
		if (!eventInfo.exists) {
			throw new Error('Event not found');
		}
		if (!eventInfo.isPublic) {
			throw new Error('External check-in is only allowed for public events');
		}

		// Prevent duplicate check-in by email
		const alreadyCheckedIn = await hasExternalCheckedIn(input.eventId, input.email);
		if (alreadyCheckedIn) {
			throw new Error('This email has already checked in to this event');
		}

		const fields: Airtable.FieldSet = {
			[ATTENDANCE_FIELDS.EVENT]: [input.eventId],
			[ATTENDANCE_FIELDS.EXTERNAL_NAME]: input.name,
			[ATTENDANCE_FIELDS.EXTERNAL_EMAIL]: input.email,
			[ATTENDANCE_FIELDS.CHECKIN_TIME]: new Date().toISOString(),
			[ATTENDANCE_FIELDS.STATUS]: 'Present',
		};

		const record = await attendanceTable.create(fields);

		return {
			id: record.id,
			eventId: input.eventId,
			externalName: input.name,
			externalEmail: input.email,
			checkinTime: fields[ATTENDANCE_FIELDS.CHECKIN_TIME] as string,
			status: 'Present',
		};
	}

	/**
	 * Get all attendance records for an event
	 */
	async function getAttendanceForEvent(eventId: string): Promise<Attendance[]> {
		const records = await attendanceTable
			.select({
				filterByFormula: `{${ATTENDANCE_FIELDS.EVENT}} = "${eventId}"`,
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			const apprenticeLink = record.get(ATTENDANCE_FIELDS.APPRENTICE) as string[] | undefined;
			return {
				id: record.id,
				eventId,
				apprenticeId: apprenticeLink?.[0],
				externalName: record.get(ATTENDANCE_FIELDS.EXTERNAL_NAME) as string | undefined,
				externalEmail: record.get(ATTENDANCE_FIELDS.EXTERNAL_EMAIL) as string | undefined,
				checkinTime: record.get(ATTENDANCE_FIELDS.CHECKIN_TIME) as string,
				status: (record.get(ATTENDANCE_FIELDS.STATUS) as Attendance['status']) ?? 'Present',
			};
		});
	}

	return {
		hasUserCheckedIn,
		hasExternalCheckedIn,
		createAttendance,
		createExternalAttendance,
		getAttendanceForEvent,
	};
}
