import Airtable from 'airtable';

import { TABLES, COHORT_FIELDS, APPRENTICE_FIELDS } from './config.ts';

export interface Apprentice {
	id: string;
	name: string;
	email: string | null;
	status: string | null;
	cohortNumber: string | null;
}

export type UserType = 'staff' | 'student';

export function createAirtableClient(apiKey: string, baseId: string) {
	Airtable.configure({ apiKey });
	const base = Airtable.base(baseId);

	/**
	 * Get all apprentices for a FAC Cohort (e.g., "FAC29" returns apprentices from FAC29.1, FAC29.2, etc.)
	 *
	 * Note: filterByFormula requires field NAME "FAC Cohort" - this would break if renamed in Airtable
	 */
	async function getApprenticesByFacCohort(facCohort: string): Promise<Apprentice[]> {
		const cohortsTable = base(TABLES.COHORTS);
		const apprenticesTable = base(TABLES.APPRENTICES);

		// Step 1: Find all cohorts belonging to the FAC Cohort
		const cohorts = await cohortsTable
			.select({
				filterByFormula: `{FAC Cohort} = "${facCohort}"`,
				returnFieldsByFieldId: true,
			})
			.all();

		if (cohorts.length === 0) {
			return [];
		}

		// Step 2: Collect apprentice IDs with their cohort numbers
		const apprenticeMap = new Map<string, string>();
		for (const cohort of cohorts) {
			const cohortNum = cohort.get(COHORT_FIELDS.NUMBER) as string | undefined;
			const apprenticeIds = cohort.get(COHORT_FIELDS.APPRENTICES) as string[] | undefined;
			if (apprenticeIds) {
				for (const id of apprenticeIds) {
					apprenticeMap.set(id, cohortNum ?? '');
				}
			}
		}

		if (apprenticeMap.size === 0) {
			return [];
		}

		// Step 3: Fetch apprentice details
		const recordIdFormula = [...apprenticeMap.keys()].map(id => `RECORD_ID() = "${id}"`).join(', ');
		const records = await apprenticesTable
			.select({
				filterByFormula: `OR(${recordIdFormula})`,
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			// Email is a lookup field, returns array
			const emailLookup = record.get(APPRENTICE_FIELDS.EMAIL) as string[] | undefined;
			return {
				id: record.id,
				name: record.get(APPRENTICE_FIELDS.NAME) as string,
				email: emailLookup?.[0] ?? null,
				status: (record.get(APPRENTICE_FIELDS.STATUS) as string) || null,
				cohortNumber: apprenticeMap.get(record.id) ?? null,
			};
		});
	}

	/**
	 * Find a user by email and return their type (staff or student)
	 *
	 * Note: filterByFormula requires field NAME "Learner email" - this would break if renamed in Airtable
	 */
	async function findUserByEmail(email: string): Promise<{ type: UserType } | null> {
		const apprenticesTable = base(TABLES.APPRENTICES);

		const records = await apprenticesTable
			.select({
				filterByFormula: `{Learner email} = "${email}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (records.length > 0) {
			return { type: 'student' };
		}

		// TODO: Check Staff table when available
		return null;
	}

	return {
		getApprenticesByFacCohort,
		findUserByEmail,
	};
}
