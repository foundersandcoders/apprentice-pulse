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
			return {
				id: record.id,
				name: record.get(EVENT_FIELDS.NAME) as string,
				dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
				cohortId: cohortLookup?.[0] ?? '',
				eventType: record.get(EVENT_FIELDS.EVENT_TYPE) as EventType,
				surveyUrl: record.get(EVENT_FIELDS.SURVEY) as string | undefined,
				isPublic: (record.get(EVENT_FIELDS.PUBLIC) as boolean) ?? false,
				checkInCode: record.get(EVENT_FIELDS.CHECK_IN_CODE) as number | undefined,
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
			return {
				id: record.id,
				name: record.get(EVENT_FIELDS.NAME) as string,
				dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
				cohortId: cohortLookup?.[0] ?? '',
				eventType: record.get(EVENT_FIELDS.EVENT_TYPE) as EventType,
				surveyUrl: record.get(EVENT_FIELDS.SURVEY) as string | undefined,
				isPublic: (record.get(EVENT_FIELDS.PUBLIC) as boolean) ?? false,
				checkInCode: record.get(EVENT_FIELDS.CHECK_IN_CODE) as number | undefined,
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

		if (data.cohortId) fields[EVENT_FIELDS.COHORT] = [data.cohortId];
		if (data.surveyUrl) fields[EVENT_FIELDS.SURVEY] = data.surveyUrl;
		if (data.isPublic !== undefined) fields[EVENT_FIELDS.PUBLIC] = data.isPublic;
		if (data.checkInCode !== undefined) fields[EVENT_FIELDS.CHECK_IN_CODE] = data.checkInCode;

		const record = await eventsTable.create(fields);

		return {
			id: record.id,
			name: data.name,
			dateTime: data.dateTime,
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

	return {
		listEvents,
		getEvent,
		createEvent,
		updateEvent,
		deleteEvent,
	};
}
