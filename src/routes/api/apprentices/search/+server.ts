import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAirtableClient } from '$lib/airtable/airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS } from '$env/static/private';
import Airtable from 'airtable';
import { TABLES, APPRENTICE_FIELDS, COHORT_FIELDS } from '$lib/airtable/config';

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim();

	// Require at least 2 characters to search
	if (!query || query.length < 2) {
		return json({ success: true, apprentices: [] });
	}

	try {
		// Configure Airtable
		Airtable.configure({ apiKey: AIRTABLE_API_KEY });
		const base = Airtable.base(AIRTABLE_BASE_ID_LEARNERS);
		const apprenticesTable = base(TABLES.APPRENTICES);
		const cohortsTable = base(TABLES.COHORTS);

		// Get all apprentices
		const apprenticeRecords = await apprenticesTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		// Get all cohorts to map cohort IDs to numbers
		const cohortRecords = await cohortsTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		const cohortMap = new Map<string, number>();
		cohortRecords.forEach(record => {
			const cohortNumber = record.get(COHORT_FIELDS.NUMBER) as string;
			cohortMap.set(record.id, parseInt(cohortNumber) || 0);
		});

		// Filter and format results
		const searchResults = apprenticeRecords
			.filter(record => {
				const name = record.get(APPRENTICE_FIELDS.NAME) as string;
				return name && name.toLowerCase().includes(query.toLowerCase());
			})
			.slice(0, 10) // Limit to 10 results
			.map(record => {
				// Email is a lookup field, returns array
				const emailLookup = record.get(APPRENTICE_FIELDS.EMAIL) as string[] | undefined;
				const cohortIds = record.get(APPRENTICE_FIELDS.COHORT) as string[] | undefined;
				const cohortNumbers = cohortIds?.map(id => cohortMap.get(id)).filter(Boolean) || [];

				return {
					id: record.id,
					name: record.get(APPRENTICE_FIELDS.NAME) as string,
					email: emailLookup?.[0] || '',
					status: (record.get(APPRENTICE_FIELDS.STATUS) as string) || 'Active',
					cohortNumbers,
				};
			});

		return json({
			success: true,
			apprentices: searchResults
		});
	}
	catch (error) {
		console.error('Failed to search apprentices:', error);
		return json({
			success: false,
			error: 'Failed to search apprentices'
		}, { status: 500 });
	}
};