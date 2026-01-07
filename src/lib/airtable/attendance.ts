import Airtable from 'airtable';

import { TABLES, ATTENDANCE_FIELDS, EVENT_FIELDS, COHORT_FIELDS, APPRENTICE_FIELDS } from './config.js';
import type {
	Attendance,
	CreateAttendanceInput,
	CreateExternalAttendanceInput,
	UpdateAttendanceInput,
	AttendanceStats,
	AttendanceTrend,
	ApprenticeAttendanceStats,
	CohortAttendanceStats,
	AttendanceSummary,
	AttendanceHistoryEntry,
} from '../types/attendance.js';

export function createAttendanceClient(apiKey: string, baseId: string) {
	Airtable.configure({ apiKey });
	const base = Airtable.base(baseId);
	const attendanceTable = base(TABLES.ATTENDANCE);
	const eventsTable = base(TABLES.EVENTS);

	/**
	 * Check if an event exists and return its details for check-in validation
	 */
	async function getEventInfo(eventId: string): Promise<{
		exists: boolean;
		isPublic: boolean;
		dateTime: string | null;
	}> {
		const records = await eventsTable
			.select({
				filterByFormula: `RECORD_ID() = "${eventId}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (records.length === 0) {
			return { exists: false, isPublic: false, dateTime: null };
		}

		const isPublic = (records[0].get(EVENT_FIELDS.PUBLIC) as boolean) ?? false;
		const dateTime = (records[0].get(EVENT_FIELDS.DATE_TIME) as string) ?? null;
		return { exists: true, isPublic, dateTime };
	}

	/**
	 * Determine attendance status based on check-in time vs event start time
	 */
	function determineStatus(eventDateTime: string | null): 'Present' | 'Late' {
		if (!eventDateTime) {
			return 'Present';
		}

		const eventTime = new Date(eventDateTime);
		const now = new Date();

		// If checking in after the event start time, mark as late
		return now > eventTime ? 'Late' : 'Present';
	}

	/**
	 * Check if a registered user has already checked in to an event
	 */
	async function hasUserCheckedIn(eventId: string, apprenticeId: string): Promise<boolean> {
		// Fetch all attendance for this event and filter in JavaScript
		// (filterByFormula with linked fields matches display value, not record ID)
		const records = await attendanceTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		return records.some((record) => {
			const eventLink = record.get(ATTENDANCE_FIELDS.EVENT) as string[] | undefined;
			const apprenticeLink = record.get(ATTENDANCE_FIELDS.APPRENTICE) as string[] | undefined;
			return eventLink?.includes(eventId) && apprenticeLink?.includes(apprenticeId);
		});
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
	 * Get a user's attendance record for a specific event (if exists)
	 */
	async function getUserAttendanceForEvent(eventId: string, apprenticeId: string): Promise<Attendance | null> {
		const records = await attendanceTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		const record = records.find((r) => {
			const eventLink = r.get(ATTENDANCE_FIELDS.EVENT) as string[] | undefined;
			const apprenticeLink = r.get(ATTENDANCE_FIELDS.APPRENTICE) as string[] | undefined;
			return eventLink?.includes(eventId) && apprenticeLink?.includes(apprenticeId);
		});

		if (!record) {
			return null;
		}

		return {
			id: record.id,
			eventId,
			apprenticeId,
			checkinTime: record.get(ATTENDANCE_FIELDS.CHECKIN_TIME) as string,
			status: (record.get(ATTENDANCE_FIELDS.STATUS) as Attendance['status']) ?? 'Present',
		};
	}

	/**
	 * Mark a user as "Not Coming" for an event
	 * - Creates new attendance record if none exists
	 * - Returns existing record if already marked "Not Coming"
	 * - Throws error if user already checked in (Present/Late)
	 */
	async function markNotComing(input: CreateAttendanceInput): Promise<Attendance> {
		// Validate event exists
		const eventInfo = await getEventInfo(input.eventId);
		if (!eventInfo.exists) {
			throw new Error('Event not found');
		}

		// Check if user already has an attendance record
		const existing = await getUserAttendanceForEvent(input.eventId, input.apprenticeId);
		if (existing) {
			if (existing.status === 'Not Coming') {
				// Already marked as not coming - idempotent
				return existing;
			}
			// Already checked in (Present/Late/Absent/Excused)
			throw new Error('User already has an attendance record for this event');
		}

		// Create new attendance record with "Not Coming" status
		const fields: Airtable.FieldSet = {
			[ATTENDANCE_FIELDS.EVENT]: [input.eventId],
			[ATTENDANCE_FIELDS.APPRENTICE]: [input.apprenticeId],
			[ATTENDANCE_FIELDS.STATUS]: 'Not Coming',
		};

		const record = await attendanceTable.create(fields);

		return {
			id: record.id,
			eventId: input.eventId,
			apprenticeId: input.apprenticeId,
			checkinTime: '', // No check-in time for "Not Coming"
			status: 'Not Coming',
		};
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

		const status = determineStatus(eventInfo.dateTime);
		const fields: Airtable.FieldSet = {
			[ATTENDANCE_FIELDS.EVENT]: [input.eventId],
			[ATTENDANCE_FIELDS.APPRENTICE]: [input.apprenticeId],
			[ATTENDANCE_FIELDS.CHECKIN_TIME]: new Date().toISOString(),
			[ATTENDANCE_FIELDS.STATUS]: status,
		};

		const record = await attendanceTable.create(fields);

		return {
			id: record.id,
			eventId: input.eventId,
			apprenticeId: input.apprenticeId,
			checkinTime: fields[ATTENDANCE_FIELDS.CHECKIN_TIME] as string,
			status,
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

		const status = determineStatus(eventInfo.dateTime);
		const fields: Airtable.FieldSet = {
			[ATTENDANCE_FIELDS.EVENT]: [input.eventId],
			[ATTENDANCE_FIELDS.EXTERNAL_NAME]: input.name,
			[ATTENDANCE_FIELDS.EXTERNAL_EMAIL]: input.email,
			[ATTENDANCE_FIELDS.CHECKIN_TIME]: new Date().toISOString(),
			[ATTENDANCE_FIELDS.STATUS]: status,
		};

		const record = await attendanceTable.create(fields);

		return {
			id: record.id,
			eventId: input.eventId,
			externalName: input.name,
			externalEmail: input.email,
			checkinTime: fields[ATTENDANCE_FIELDS.CHECKIN_TIME] as string,
			status,
		};
	}

	/**
	 * Get attendance records by their IDs
	 */
	async function getAttendanceByIds(attendanceIds: string[]): Promise<Attendance[]> {
		if (attendanceIds.length === 0) {
			return [];
		}

		// Build OR formula to fetch multiple records by ID
		const idFormula = attendanceIds.map(id => `RECORD_ID() = "${id}"`).join(', ');
		const records = await attendanceTable
			.select({
				filterByFormula: `OR(${idFormula})`,
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			const apprenticeLink = record.get(ATTENDANCE_FIELDS.APPRENTICE) as string[] | undefined;
			const eventLink = record.get(ATTENDANCE_FIELDS.EVENT) as string[] | undefined;
			return {
				id: record.id,
				eventId: eventLink?.[0] ?? '',
				apprenticeId: apprenticeLink?.[0],
				externalName: record.get(ATTENDANCE_FIELDS.EXTERNAL_NAME) as string | undefined,
				externalEmail: record.get(ATTENDANCE_FIELDS.EXTERNAL_EMAIL) as string | undefined,
				checkinTime: record.get(ATTENDANCE_FIELDS.CHECKIN_TIME) as string,
				status: (record.get(ATTENDANCE_FIELDS.STATUS) as Attendance['status']) ?? 'Present',
			};
		});
	}

	/**
	 * Update an attendance record's status and optionally check-in time
	 */
	async function updateAttendance(attendanceId: string, input: UpdateAttendanceInput): Promise<Attendance> {
		const fields: Airtable.FieldSet = {
			[ATTENDANCE_FIELDS.STATUS]: input.status,
		};

		if (input.checkinTime) {
			fields[ATTENDANCE_FIELDS.CHECKIN_TIME] = input.checkinTime;
		}

		const record = await attendanceTable.update(attendanceId, fields);

		const apprenticeLink = record.get(ATTENDANCE_FIELDS.APPRENTICE) as string[] | undefined;
		const eventLink = record.get(ATTENDANCE_FIELDS.EVENT) as string[] | undefined;

		return {
			id: record.id,
			eventId: eventLink?.[0] ?? '',
			apprenticeId: apprenticeLink?.[0],
			externalName: record.get(ATTENDANCE_FIELDS.EXTERNAL_NAME) as string | undefined,
			externalEmail: record.get(ATTENDANCE_FIELDS.EXTERNAL_EMAIL) as string | undefined,
			checkinTime: record.get(ATTENDANCE_FIELDS.CHECKIN_TIME) as string,
			status: record.get(ATTENDANCE_FIELDS.STATUS) as Attendance['status'],
		};
	}

	/**
	 * Get all attendance records for an event
	 * @deprecated Use getAttendanceByIds with event.attendanceIds instead
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

	// ============================================
	// Aggregate query helpers and functions
	// ============================================

	/** Event data needed for stats calculations */
	interface EventForStats {
		id: string;
		dateTime: string;
		cohortIds: string[];
	}

	/**
	 * Fetch all attendance records
	 */
	async function getAllAttendance(): Promise<Attendance[]> {
		const records = await attendanceTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			const apprenticeLink = record.get(ATTENDANCE_FIELDS.APPRENTICE) as string[] | undefined;
			const eventLink = record.get(ATTENDANCE_FIELDS.EVENT) as string[] | undefined;
			return {
				id: record.id,
				eventId: eventLink?.[0] ?? '',
				apprenticeId: apprenticeLink?.[0],
				externalName: record.get(ATTENDANCE_FIELDS.EXTERNAL_NAME) as string | undefined,
				externalEmail: record.get(ATTENDANCE_FIELDS.EXTERNAL_EMAIL) as string | undefined,
				checkinTime: record.get(ATTENDANCE_FIELDS.CHECKIN_TIME) as string,
				status: (record.get(ATTENDANCE_FIELDS.STATUS) as Attendance['status']) ?? 'Present',
			};
		});
	}

	/**
	 * Fetch all events (minimal data for stats)
	 */
	async function getAllEvents(): Promise<EventForStats[]> {
		const records = await eventsTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			const cohortIds = record.get(EVENT_FIELDS.COHORT) as string[] | undefined;
			return {
				id: record.id,
				dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
				cohortIds: cohortIds ?? [],
			};
		});
	}

	// ============================================
	// Filter helpers (single source of truth)
	// ============================================

	/**
	 * Get events for a specific cohort, optionally filtered by date range
	 * This is THE source of truth for which events count toward an apprentice's stats
	 */
	function getEventsForCohort(
		allEvents: EventForStats[],
		cohortId: string | null,
		options?: { startDate?: Date; endDate?: Date }
	): EventForStats[] {
		// Filter by cohort (if no cohort, return empty - apprentice must belong to a cohort)
		if (!cohortId) {
			return [];
		}

		let events = allEvents.filter(e => e.cohortIds.includes(cohortId));

		// Filter by date range if provided
		if (options?.startDate && options?.endDate) {
			events = events.filter(e => {
				const eventDate = new Date(e.dateTime);
				return eventDate >= options.startDate! && eventDate <= options.endDate!;
			});
		}

		return events;
	}

	/**
	 * Filter attendance records to only include those for the specified events
	 * Ensures attendance count never exceeds event count
	 */
	function filterAttendanceToEvents(
		attendance: Attendance[],
		eventIds: Set<string>
	): Attendance[] {
		return attendance.filter(a => eventIds.has(a.eventId));
	}

	/**
	 * Calculate trend by comparing two periods
	 */
	function calculateTrend(currentRate: number, previousRate: number): AttendanceTrend {
		const change = currentRate - previousRate;
		let direction: AttendanceTrend['direction'] = 'stable';
		if (change > 2) direction = 'up';
		else if (change < -2) direction = 'down';

		return {
			direction,
			change: Math.round(change * 10) / 10,
			currentRate,
			previousRate,
		};
	}

	/**
	 * Calculate base attendance stats from attendance records
	 * Missing events (no attendance record) are counted as 'Absent'
	 */
	function calculateStats(attendanceRecords: Attendance[], totalEvents: number): AttendanceStats {
		const present = attendanceRecords.filter(a => a.status === 'Present').length;
		const late = attendanceRecords.filter(a => a.status === 'Late').length;
		const explicitAbsent = attendanceRecords.filter(a => a.status === 'Absent').length;
		const excused = attendanceRecords.filter(a => a.status === 'Excused').length;
		const notComing = attendanceRecords.filter(a => a.status === 'Not Coming').length;

		// Count missing attendance records as 'Absent'
		// Guard against negative values (shouldn't happen if attendance is filtered correctly)
		const recordedEvents = attendanceRecords.length;
		const missingEvents = Math.max(0, totalEvents - recordedEvents);
		const absent = explicitAbsent + missingEvents;

		const attended = present + late;

		const attendanceRate = totalEvents > 0
			? Math.round((attended / totalEvents) * 1000) / 10
			: 0;

		return {
			totalEvents,
			attended,
			present,
			late,
			absent,
			excused,
			notComing,
			attendanceRate,
		};
	}

	/**
	 * Get attendance statistics for a specific apprentice with optional date filtering
	 */
	async function getApprenticeAttendanceStatsWithDateFilter(
		apprenticeId: string,
		startDate: Date | null = null,
		endDate: Date | null = null
	): Promise<ApprenticeAttendanceStats | null> {
		const apprenticesTable = base(TABLES.APPRENTICES);
		const cohortsTable = base(TABLES.COHORTS);

		// Get apprentice info
		const apprenticeRecords = await apprenticesTable
			.select({
				filterByFormula: `RECORD_ID() = "${apprenticeId}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (apprenticeRecords.length === 0) {
			return null;
		}

		const apprentice = apprenticeRecords[0];
		const apprenticeName = apprentice.get(APPRENTICE_FIELDS.NAME) as string;
		const cohortLink = apprentice.get(APPRENTICE_FIELDS.COHORT) as string[] | undefined;
		const cohortId = cohortLink?.[0] ?? null;

		// Get cohort name if available
		let cohortName: string | null = null;
		if (cohortId) {
			const cohortRecords = await cohortsTable
				.select({
					filterByFormula: `RECORD_ID() = "${cohortId}"`,
					maxRecords: 1,
					returnFieldsByFieldId: true,
				})
				.all();
			if (cohortRecords.length > 0) {
				cohortName = cohortRecords[0].get(COHORT_FIELDS.NUMBER) as string;
			}
		}

		// Get all events for this apprentice's cohort
		const allEvents = await getAllEvents();
		let relevantEvents = cohortId
			? allEvents.filter(e => e.cohortIds.includes(cohortId))
			: allEvents;

		// Filter events by date range if provided
		if (startDate && endDate) {
			relevantEvents = relevantEvents.filter(e => {
				const eventDate = new Date(e.dateTime);
				return eventDate >= startDate && eventDate <= endDate;
			});
		}

		// Get attendance records for this apprentice
		const allAttendance = await getAllAttendance();
		let apprenticeAttendance = allAttendance.filter(a => a.apprenticeId === apprenticeId);

		// Filter attendance to only events in the date range
		if (startDate && endDate) {
			const relevantEventIds = new Set(relevantEvents.map(e => e.id));
			apprenticeAttendance = apprenticeAttendance.filter(a => relevantEventIds.has(a.eventId));
		}

		// Calculate stats
		const stats = calculateStats(apprenticeAttendance, relevantEvents.length);

		// Calculate trend (last 4 weeks vs previous 4 weeks within the filtered range)
		const now = new Date();
		const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
		const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

		// Apply date range constraints to trend calculation
		const trendStartDate = startDate && startDate > eightWeeksAgo ? startDate : eightWeeksAgo;
		const trendEndDate = endDate && endDate < now ? endDate : now;

		const recentEvents = relevantEvents.filter(e => {
			const d = new Date(e.dateTime);
			return d >= fourWeeksAgo && d <= trendEndDate;
		});
		const previousEvents = relevantEvents.filter(e => {
			const d = new Date(e.dateTime);
			return d >= trendStartDate && d < fourWeeksAgo;
		});

		const recentEventIds = new Set(recentEvents.map(e => e.id));
		const previousEventIds = new Set(previousEvents.map(e => e.id));

		const recentAttendance = apprenticeAttendance.filter(a => recentEventIds.has(a.eventId));
		const previousAttendance = apprenticeAttendance.filter(a => previousEventIds.has(a.eventId));

		const recentRate = recentEvents.length > 0
			? (recentAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / recentEvents.length) * 100
			: 0;
		const previousRate = previousEvents.length > 0
			? (previousAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / previousEvents.length) * 100
			: 0;

		return {
			...stats,
			apprenticeId,
			apprenticeName,
			cohortId,
			cohortName,
			trend: calculateTrend(recentRate, previousRate),
		};
	}

	/**
	 * Get attendance statistics for a specific apprentice
	 */
	async function getApprenticeAttendanceStats(apprenticeId: string): Promise<ApprenticeAttendanceStats | null> {
		const apprenticesTable = base(TABLES.APPRENTICES);
		const cohortsTable = base(TABLES.COHORTS);

		// Get apprentice info
		const apprenticeRecords = await apprenticesTable
			.select({
				filterByFormula: `RECORD_ID() = "${apprenticeId}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (apprenticeRecords.length === 0) {
			return null;
		}

		const apprentice = apprenticeRecords[0];
		const apprenticeName = apprentice.get(APPRENTICE_FIELDS.NAME) as string;
		const cohortLink = apprentice.get(APPRENTICE_FIELDS.COHORT) as string[] | undefined;
		const cohortId = cohortLink?.[0] ?? null;

		// Get cohort name if available
		let cohortName: string | null = null;
		if (cohortId) {
			const cohortRecords = await cohortsTable
				.select({
					filterByFormula: `RECORD_ID() = "${cohortId}"`,
					maxRecords: 1,
					returnFieldsByFieldId: true,
				})
				.all();
			if (cohortRecords.length > 0) {
				cohortName = cohortRecords[0].get(COHORT_FIELDS.NUMBER) as string;
			}
		}

		// Get all events for this apprentice's cohort
		const allEvents = await getAllEvents();
		const relevantEvents = cohortId
			? allEvents.filter(e => e.cohortIds.includes(cohortId))
			: allEvents;

		// Get attendance records for this apprentice
		const allAttendance = await getAllAttendance();
		const apprenticeAttendance = allAttendance.filter(a => a.apprenticeId === apprenticeId);

		// Calculate stats
		const stats = calculateStats(apprenticeAttendance, relevantEvents.length);

		// Calculate trend (last 4 weeks vs previous 4 weeks)
		const now = new Date();
		const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
		const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

		const recentEvents = relevantEvents.filter(e => new Date(e.dateTime) >= fourWeeksAgo);
		const previousEvents = relevantEvents.filter((e) => {
			const d = new Date(e.dateTime);
			return d >= eightWeeksAgo && d < fourWeeksAgo;
		});

		const recentEventIds = new Set(recentEvents.map(e => e.id));
		const previousEventIds = new Set(previousEvents.map(e => e.id));

		const recentAttendance = apprenticeAttendance.filter(a => recentEventIds.has(a.eventId));
		const previousAttendance = apprenticeAttendance.filter(a => previousEventIds.has(a.eventId));

		const recentRate = recentEvents.length > 0
			? (recentAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / recentEvents.length) * 100
			: 0;
		const previousRate = previousEvents.length > 0
			? (previousAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / previousEvents.length) * 100
			: 0;

		return {
			...stats,
			apprenticeId,
			apprenticeName,
			cohortId,
			cohortName,
			trend: calculateTrend(recentRate, previousRate),
		};
	}

	/**
	 * Get attendance statistics for a specific cohort
	 */
	async function getCohortAttendanceStats(cohortId: string): Promise<CohortAttendanceStats | null> {
		const cohortsTable = base(TABLES.COHORTS);

		// Get cohort info
		const cohortRecords = await cohortsTable
			.select({
				filterByFormula: `RECORD_ID() = "${cohortId}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (cohortRecords.length === 0) {
			return null;
		}

		const cohort = cohortRecords[0];
		const cohortName = cohort.get(COHORT_FIELDS.NUMBER) as string;
		const apprenticeIds = cohort.get(COHORT_FIELDS.APPRENTICES) as string[] | undefined;
		const apprenticeCount = apprenticeIds?.length ?? 0;

		// Get events for this cohort
		const allEvents = await getAllEvents();
		const cohortEvents = allEvents.filter(e => e.cohortIds.includes(cohortId));

		// Get attendance for apprentices in this cohort
		const allAttendance = await getAllAttendance();
		const cohortAttendance = apprenticeIds
			? allAttendance.filter(a => a.apprenticeId && apprenticeIds.includes(a.apprenticeId))
			: [];

		// Total expected attendance = events * apprentices
		const totalExpected = cohortEvents.length * apprenticeCount;
		const stats = calculateStats(cohortAttendance, totalExpected);

		// Recalculate attendance rate for cohort (attended / expected)
		const attended = cohortAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
		stats.attendanceRate = totalExpected > 0
			? Math.round((attended / totalExpected) * 1000) / 10
			: 0;

		// Calculate trend
		const now = new Date();
		const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
		const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

		const recentEvents = cohortEvents.filter(e => new Date(e.dateTime) >= fourWeeksAgo);
		const previousEvents = cohortEvents.filter((e) => {
			const d = new Date(e.dateTime);
			return d >= eightWeeksAgo && d < fourWeeksAgo;
		});

		const recentEventIds = new Set(recentEvents.map(e => e.id));
		const previousEventIds = new Set(previousEvents.map(e => e.id));

		const recentAttendance = cohortAttendance.filter(a => recentEventIds.has(a.eventId));
		const previousAttendance = cohortAttendance.filter(a => previousEventIds.has(a.eventId));

		const recentExpected = recentEvents.length * apprenticeCount;
		const previousExpected = previousEvents.length * apprenticeCount;

		const recentRate = recentExpected > 0
			? (recentAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / recentExpected) * 100
			: 0;
		const previousRate = previousExpected > 0
			? (previousAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / previousExpected) * 100
			: 0;

		return {
			...stats,
			cohortId,
			cohortName,
			apprenticeCount,
			trend: calculateTrend(recentRate, previousRate),
		};
	}

	/**
	 * Get overall attendance summary for dashboard
	 */
	async function getAttendanceSummary(): Promise<AttendanceSummary> {
		const cohortsTable = base(TABLES.COHORTS);

		// Get all data
		const [allAttendance, allEvents, cohortRecords] = await Promise.all([
			getAllAttendance(),
			getAllEvents(),
			cohortsTable.select({ returnFieldsByFieldId: true }).all(),
		]);

		// Count total apprentices
		let totalApprentices = 0;
		const allApprenticeIds = new Set<string>();
		for (const cohort of cohortRecords) {
			const apprenticeIds = cohort.get(COHORT_FIELDS.APPRENTICES) as string[] | undefined;
			if (apprenticeIds) {
				apprenticeIds.forEach(id => allApprenticeIds.add(id));
			}
		}
		totalApprentices = allApprenticeIds.size;

		// Calculate overall stats (registered users only)
		const registeredAttendance = allAttendance.filter(a => a.apprenticeId);
		const stats = calculateStats(registeredAttendance, allEvents.length * totalApprentices);

		// Recalculate rate
		const attended = registeredAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
		const totalExpected = allEvents.length * totalApprentices;
		stats.attendanceRate = totalExpected > 0
			? Math.round((attended / totalExpected) * 1000) / 10
			: 0;

		// Calculate trend
		const now = new Date();
		const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
		const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);
		const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

		const recentEvents = allEvents.filter(e => new Date(e.dateTime) >= fourWeeksAgo);
		const previousEvents = allEvents.filter((e) => {
			const d = new Date(e.dateTime);
			return d >= eightWeeksAgo && d < fourWeeksAgo;
		});

		const recentEventIds = new Set(recentEvents.map(e => e.id));
		const previousEventIds = new Set(previousEvents.map(e => e.id));

		const recentAttendance = registeredAttendance.filter(a => recentEventIds.has(a.eventId));
		const previousAttendance = registeredAttendance.filter(a => previousEventIds.has(a.eventId));

		const recentExpected = recentEvents.length * totalApprentices;
		const previousExpected = previousEvents.length * totalApprentices;

		const recentRate = recentExpected > 0
			? (recentAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / recentExpected) * 100
			: 0;
		const previousRate = previousExpected > 0
			? (previousAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / previousExpected) * 100
			: 0;

		// Count low attendance apprentices (< 80%)
		const apprenticeAttendanceCounts = new Map<string, { attended: number; total: number }>();
		for (const id of allApprenticeIds) {
			apprenticeAttendanceCounts.set(id, { attended: 0, total: 0 });
		}

		// Count events per apprentice based on their cohort
		for (const cohort of cohortRecords) {
			const apprenticeIds = cohort.get(COHORT_FIELDS.APPRENTICES) as string[] | undefined;
			const cohortId = cohort.id;
			if (!apprenticeIds) continue;

			const cohortEventCount = allEvents.filter(e => e.cohortIds.includes(cohortId)).length;
			for (const id of apprenticeIds) {
				const current = apprenticeAttendanceCounts.get(id)!;
				current.total += cohortEventCount;
			}
		}

		// Count attended per apprentice
		for (const attendance of registeredAttendance) {
			if (!attendance.apprenticeId) continue;
			if (attendance.status === 'Present' || attendance.status === 'Late') {
				const current = apprenticeAttendanceCounts.get(attendance.apprenticeId);
				if (current) {
					current.attended++;
				}
			}
		}

		let lowAttendanceCount = 0;
		for (const [, counts] of apprenticeAttendanceCounts) {
			if (counts.total > 0) {
				const rate = (counts.attended / counts.total) * 100;
				if (rate < 80) {
					lowAttendanceCount++;
				}
			}
		}

		// Recent check-ins (last 7 days)
		const recentCheckIns = allAttendance.filter((a) => {
			if (!a.checkinTime) return false;
			return new Date(a.checkinTime) >= sevenDaysAgo;
		}).length;

		return {
			overall: stats,
			trend: calculateTrend(recentRate, previousRate),
			totalApprentices,
			lowAttendanceCount,
			recentCheckIns,
		};
	}

	/**
	 * Get attendance history for a specific apprentice
	 * Returns a list of events with their attendance status
	 */
	async function getApprenticeAttendanceHistory(apprenticeId: string): Promise<AttendanceHistoryEntry[]> {
		const apprenticesTable = base(TABLES.APPRENTICES);

		// Get apprentice info to find their cohort
		const apprenticeRecords = await apprenticesTable
			.select({
				filterByFormula: `RECORD_ID() = "${apprenticeId}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (apprenticeRecords.length === 0) {
			return [];
		}

		const apprentice = apprenticeRecords[0];
		const cohortLink = apprentice.get(APPRENTICE_FIELDS.COHORT) as string[] | undefined;
		const cohortId = cohortLink?.[0] ?? null;

		// Get all events for this apprentice's cohort
		const allEvents = await eventsTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		// Get all attendance records and filter by apprentice ID in JavaScript
		// (filterByFormula with linked fields matches display value, not record ID)
		const allAttendanceRecords = await attendanceTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		// Filter to only records for this apprentice
		const attendanceRecords = allAttendanceRecords.filter((record) => {
			const apprenticeLink = record.get(ATTENDANCE_FIELDS.APPRENTICE) as string[] | undefined;
			return apprenticeLink?.includes(apprenticeId);
		});

		// Create a map of eventId -> attendance record
		const attendanceMap = new Map<string, Attendance>();
		for (const record of attendanceRecords) {
			const eventLink = record.get(ATTENDANCE_FIELDS.EVENT) as string[] | undefined;
			const eventId = eventLink?.[0];
			if (eventId) {
				attendanceMap.set(eventId, {
					id: record.id,
					eventId,
					apprenticeId,
					checkinTime: record.get(ATTENDANCE_FIELDS.CHECKIN_TIME) as string,
					status: (record.get(ATTENDANCE_FIELDS.STATUS) as Attendance['status']) ?? 'Present',
				});
			}
		}

		// Include events that are either:
		// 1. For the apprentice's cohort (expected events - show as Missed if no attendance)
		// 2. Have an attendance record (apprentice checked in, even if not their cohort)
		// 3. All events if apprentice has no cohort
		const relevantEventIds = new Set<string>();

		if (cohortId) {
			// Add cohort events
			for (const event of allEvents) {
				const cohortIds = event.get(EVENT_FIELDS.COHORT) as string[] | undefined;
				if (cohortIds?.includes(cohortId)) {
					relevantEventIds.add(event.id);
				}
			}
		}
		else {
			// No cohort - include all events
			for (const event of allEvents) {
				relevantEventIds.add(event.id);
			}
		}

		// Add any events the apprentice has attendance for (regardless of cohort)
		for (const eventId of attendanceMap.keys()) {
			relevantEventIds.add(eventId);
		}

		// Build the history entries
		const history: AttendanceHistoryEntry[] = allEvents
			.filter(event => relevantEventIds.has(event.id))
			.map((event) => {
				const attendance = attendanceMap.get(event.id);
				return {
					eventId: event.id,
					eventName: (event.get(EVENT_FIELDS.NAME) as string) || 'Unnamed Event',
					eventDateTime: event.get(EVENT_FIELDS.DATE_TIME) as string,
					status: attendance ? attendance.status : 'Absent',
					checkinTime: attendance?.checkinTime ?? null,
					attendanceId: attendance?.id ?? null,
				};
			});

		// Sort by date (most recent first)
		history.sort((a, b) => new Date(b.eventDateTime).getTime() - new Date(a.eventDateTime).getTime());

		return history;
	}

	return {
		hasUserCheckedIn,
		hasExternalCheckedIn,
		getUserAttendanceForEvent,
		createAttendance,
		createExternalAttendance,
		markNotComing,
		updateAttendance,
		getAttendanceForEvent,
		getAttendanceByIds,
		// Aggregate functions
		getAllAttendance,
		getAllEvents,
		getApprenticeAttendanceStats,
		getApprenticeAttendanceStatsWithDateFilter,
		getCohortAttendanceStats,
		getAttendanceSummary,
		getApprenticeAttendanceHistory,
	};
}
