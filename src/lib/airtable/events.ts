import Airtable from 'airtable';

import { TABLES, EVENT_FIELDS } from './config.ts';
import type { Event, EventFilters, EventType, CreateEventInput, UpdateEventInput } from '../types/event.ts';

export function createEventsClient(apiKey: string, baseId: string) {
	Airtable.configure({ apiKey });
	const base = Airtable.base(baseId);
	const eventsTable = base(TABLES.EVENTS);

	/**
	 * List events with optional filters
	 */
	async function listEvents(filters?: EventFilters): Promise<Event[]> {
		const formulaParts: string[] = [];

		if (filters?.cohortId) {
			formulaParts.push(`FIND("${filters.cohortId}", ARRAYJOIN({FAC Cohort}))`);
		}
		if (filters?.startDate) {
			formulaParts.push(`IS_AFTER({Date Time}, "${filters.startDate}")`);
		}
		if (filters?.endDate) {
			formulaParts.push(`IS_BEFORE({Date Time}, "${filters.endDate}")`);
		}

		const filterByFormula = formulaParts.length > 0
			? `AND(${formulaParts.join(', ')})`
			: '';

		const records = await eventsTable
			.select({
				filterByFormula,
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			const cohortLookup = record.get(EVENT_FIELDS.COHORT) as string[] | undefined;
			const attendanceLinks = record.get(EVENT_FIELDS.ATTENDANCE) as string[] | undefined;
			return {
				id: record.id,
				name: record.get(EVENT_FIELDS.NAME) as string,
				dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
				endDateTime: record.get(EVENT_FIELDS.END_DATE_TIME) as string | undefined,
				cohortId: cohortLookup?.[0] ?? '',
				eventType: record.get(EVENT_FIELDS.EVENT_TYPE) as EventType,
				surveyUrl: record.get(EVENT_FIELDS.SURVEY) as string | undefined,
				isPublic: (record.get(EVENT_FIELDS.PUBLIC) as boolean) ?? false,
				checkInCode: record.get(EVENT_FIELDS.CHECK_IN_CODE) as number | undefined,
				attendanceCount: attendanceLinks?.length ?? 0,
			};
		});
	}

	/**
	 * Get a single event by ID
	 */
	async function getEvent(id: string): Promise<Event | null> {
		try {
			// Use select() with RECORD_ID filter to get returnFieldsByFieldId support
			const records = await eventsTable
				.select({
					filterByFormula: `RECORD_ID() = "${id}"`,
					maxRecords: 1,
					returnFieldsByFieldId: true,
				})
				.all();

			if (records.length === 0) {
				return null;
			}

			const record = records[0];
			const cohortLookup = record.get(EVENT_FIELDS.COHORT) as string[] | undefined;
			const attendanceLinks = record.get(EVENT_FIELDS.ATTENDANCE) as string[] | undefined;
			return {
				id: record.id,
				name: record.get(EVENT_FIELDS.NAME) as string,
				dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
				endDateTime: record.get(EVENT_FIELDS.END_DATE_TIME) as string | undefined,
				cohortId: cohortLookup?.[0] ?? '',
				eventType: record.get(EVENT_FIELDS.EVENT_TYPE) as EventType,
				surveyUrl: record.get(EVENT_FIELDS.SURVEY) as string | undefined,
				isPublic: (record.get(EVENT_FIELDS.PUBLIC) as boolean) ?? false,
				checkInCode: record.get(EVENT_FIELDS.CHECK_IN_CODE) as number | undefined,
				attendanceIds: attendanceLinks ?? [],
			};
		}
		catch {
			return null;
		}
	}

	/**
	 * Create a new event
	 */
	async function createEvent(data: CreateEventInput): Promise<Event> {
		const fields: Airtable.FieldSet = {
			[EVENT_FIELDS.NAME]: data.name,
			[EVENT_FIELDS.DATE_TIME]: data.dateTime,
			[EVENT_FIELDS.EVENT_TYPE]: data.eventType,
		};

		if (data.endDateTime) fields[EVENT_FIELDS.END_DATE_TIME] = data.endDateTime;
		if (data.cohortId) fields[EVENT_FIELDS.COHORT] = [data.cohortId];
		if (data.surveyUrl) fields[EVENT_FIELDS.SURVEY] = data.surveyUrl;
		if (data.isPublic !== undefined) fields[EVENT_FIELDS.PUBLIC] = data.isPublic;
		if (data.checkInCode !== undefined) fields[EVENT_FIELDS.CHECK_IN_CODE] = data.checkInCode;

		const record = await eventsTable.create(fields);

		return {
			id: record.id,
			name: data.name,
			dateTime: data.dateTime,
			endDateTime: data.endDateTime,
			cohortId: data.cohortId ?? '',
			eventType: data.eventType,
			surveyUrl: data.surveyUrl,
			isPublic: data.isPublic ?? false,
			checkInCode: data.checkInCode,
		};
	}

	/**
	 * Update an existing event
	 */
	async function updateEvent(id: string, data: UpdateEventInput): Promise<Event> {
		const fields: Airtable.FieldSet = {};

		if (data.name !== undefined) fields[EVENT_FIELDS.NAME] = data.name;
		if (data.dateTime !== undefined) fields[EVENT_FIELDS.DATE_TIME] = data.dateTime;
		if (data.endDateTime !== undefined) fields[EVENT_FIELDS.END_DATE_TIME] = data.endDateTime;
		if (data.cohortId !== undefined) fields[EVENT_FIELDS.COHORT] = [data.cohortId];
		if (data.eventType !== undefined) fields[EVENT_FIELDS.EVENT_TYPE] = data.eventType;
		if (data.surveyUrl !== undefined) fields[EVENT_FIELDS.SURVEY] = data.surveyUrl;
		if (data.isPublic !== undefined) fields[EVENT_FIELDS.PUBLIC] = data.isPublic;
		if (data.checkInCode !== undefined) fields[EVENT_FIELDS.CHECK_IN_CODE] = data.checkInCode;

		const record = await eventsTable.update(id, fields);
		const cohortLookup = record.get(EVENT_FIELDS.COHORT) as string[] | undefined;

		return {
			id: record.id,
			name: record.get(EVENT_FIELDS.NAME) as string,
			dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
			endDateTime: record.get(EVENT_FIELDS.END_DATE_TIME) as string | undefined,
			cohortId: cohortLookup?.[0] ?? '',
			eventType: record.get(EVENT_FIELDS.EVENT_TYPE) as EventType,
			surveyUrl: record.get(EVENT_FIELDS.SURVEY) as string | undefined,
			isPublic: (record.get(EVENT_FIELDS.PUBLIC) as boolean) ?? false,
			checkInCode: record.get(EVENT_FIELDS.CHECK_IN_CODE) as number | undefined,
		};
	}

	/**
	 * Delete an event
	 */
	async function deleteEvent(id: string): Promise<void> {
		await eventsTable.destroy(id);
	}

	/**
	 * Get a public event by its check-in code
	 * Returns null if code doesn't match or event is not public
	 */
	async function getEventByCode(code: number): Promise<Event | null> {
		const records = await eventsTable
			.select({
				filterByFormula: `AND({Number} = ${code}, {Public} = TRUE())`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (records.length === 0) {
			return null;
		}

		const record = records[0];
		const cohortLookup = record.get(EVENT_FIELDS.COHORT) as string[] | undefined;
		return {
			id: record.id,
			name: record.get(EVENT_FIELDS.NAME) as string,
			dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
			endDateTime: record.get(EVENT_FIELDS.END_DATE_TIME) as string | undefined,
			cohortId: cohortLookup?.[0] ?? '',
			eventType: record.get(EVENT_FIELDS.EVENT_TYPE) as EventType,
			surveyUrl: record.get(EVENT_FIELDS.SURVEY) as string | undefined,
			isPublic: true,
			checkInCode: record.get(EVENT_FIELDS.CHECK_IN_CODE) as number | undefined,
		};
	}

	return {
		listEvents,
		getEvent,
		getEventByCode,
		createEvent,
		updateEvent,
		deleteEvent,
	};
}
