import Airtable from 'airtable';

import { TABLES, EVENT_FIELDS } from './config.js';
import type { Event, EventFilters, EventType } from '$lib/types/event.js';

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
			};
		});
	}

	/**
	 * Get a single event by ID
	 */
	async function getEvent(id: string): Promise<Event | null> {
		try {
			const record = await eventsTable.find(id);
			const cohortLookup = record.get(EVENT_FIELDS.COHORT) as string[] | undefined;
			return {
				id: record.id,
				name: record.get(EVENT_FIELDS.NAME) as string,
				dateTime: record.get(EVENT_FIELDS.DATE_TIME) as string,
				cohortId: cohortLookup?.[0] ?? '',
				eventType: record.get(EVENT_FIELDS.EVENT_TYPE) as EventType,
				surveyUrl: record.get(EVENT_FIELDS.SURVEY) as string | undefined,
			};
		}
		catch {
			return null;
		}
	}

	return {
		listEvents,
		getEvent,
	};
}
