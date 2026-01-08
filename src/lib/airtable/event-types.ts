import Airtable from 'airtable';

import { TABLES, EVENT_TYPE_FIELDS } from './config.ts';

export interface EventTypeRecord {
	id: string;
	name: string;
	defaultSurveyUrl?: string;
}

export function createEventTypesClient(apiKey: string, baseId: string) {
	Airtable.configure({ apiKey });
	const base = Airtable.base(baseId);
	const eventTypesTable = base(TABLES.EVENT_TYPES);

	/**
	 * Get all event types
	 */
	async function listEventTypes(): Promise<EventTypeRecord[]> {
		const records = await eventTypesTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map(record => ({
			id: record.id,
			name: record.get(EVENT_TYPE_FIELDS.NAME) as string,
			defaultSurveyUrl: record.get(EVENT_TYPE_FIELDS.DEFAULT_SURVEY) as string | undefined,
		}));
	}

	/**
	 * Get event type by ID
	 */
	async function getEventType(id: string): Promise<EventTypeRecord | null> {
		try {
			// Use select() with RECORD_ID filter to get returnFieldsByFieldId support
			const records = await eventTypesTable
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
			return {
				id: record.id,
				name: record.get(EVENT_TYPE_FIELDS.NAME) as string,
				defaultSurveyUrl: record.get(EVENT_TYPE_FIELDS.DEFAULT_SURVEY) as string | undefined,
			};
		}
		catch {
			return null;
		}
	}

	/**
	 * Find event type by name
	 */
	async function findEventTypeByName(name: string): Promise<EventTypeRecord | null> {
		const records = await eventTypesTable
			.select({
				filterByFormula: `{Name} = "${name}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (records.length === 0) {
			return null;
		}

		const record = records[0];
		return {
			id: record.id,
			name: record.get(EVENT_TYPE_FIELDS.NAME) as string,
			defaultSurveyUrl: record.get(EVENT_TYPE_FIELDS.DEFAULT_SURVEY) as string | undefined,
		};
	}

	return {
		listEventTypes,
		getEventType,
		findEventTypeByName,
	};
}
