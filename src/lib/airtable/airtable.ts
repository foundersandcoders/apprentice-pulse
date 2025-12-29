import Airtable from 'airtable';

import { TABLES, COHORT_FIELDS, APPRENTICE_FIELDS, STAFF_FIELDS } from './config.ts';

export interface Apprentice {
	id: string;
	name: string;
	email: string | null;
	status: string | null;
	cohortNumber: string | null;
}

export interface Cohort {
	id: string;
	name: string;
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
	 * Checks Staff table first, then Apprentices table.
	 * @deprecated Use findStaffByEmail or findApprenticeByEmail instead
	 */
	async function findUserByEmail(email: string): Promise<{ type: UserType } | null> {
		if (await findStaffByEmail(email)) {
			return { type: 'staff' };
		}
		if (await findApprenticeByEmail(email)) {
			return { type: 'student' };
		}
		return null;
	}

	/**
	 * Check if email exists in Staff table
	 */
	async function findStaffByEmail(email: string): Promise<boolean> {
		const staffTable = base(TABLES.STAFF);

		// singleCollaborator field cannot be filtered, must fetch all and iterate
		const staffRecords = await staffTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		for (const record of staffRecords) {
			const collaborator = record.get(STAFF_FIELDS.COLLABORATOR) as { email: string } | undefined;
			if (collaborator?.email?.toLowerCase() === email.toLowerCase()) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if email exists in Apprentices table
	 * Note: filterByFormula requires field NAME "Learner email" - this would break if renamed in Airtable
	 */
	async function findApprenticeByEmail(email: string): Promise<boolean> {
		const apprenticesTable = base(TABLES.APPRENTICES);

		const apprenticeRecords = await apprenticesTable
			.select({
				filterByFormula: `{Learner email} = "${email}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		return apprenticeRecords.length > 0;
	}

	/**
	 * List all cohorts
	 */
	async function listCohorts(): Promise<Cohort[]> {
		const cohortsTable = base(TABLES.COHORTS);

		const records = await cohortsTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map(record => ({
			id: record.id,
			name: (record.get(COHORT_FIELDS.NUMBER) as string) || record.id,
		}));
	}

	return {
		getApprenticesByFacCohort,
		findUserByEmail,
		findStaffByEmail,
		findApprenticeByEmail,
		listCohorts,
	};
}
