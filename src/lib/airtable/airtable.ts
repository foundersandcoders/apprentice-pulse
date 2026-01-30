import Airtable from 'airtable';

import { TABLES, COHORT_FIELDS, APPRENTICE_FIELDS, STAFF_FIELDS, TERM_FIELDS } from './config.ts';

export interface Apprentice {
	id: string;
	name: string;
	email: string | null;
	status: string | null;
	cohortNumber: string | null;
}

export interface ApprenticeRecord {
	id: string;
	name: string;
	email: string;
	cohortIds: string[]; // Record IDs of cohorts (apprentice may belong to multiple)
}

export interface Cohort {
	id: string;
	name: string;
	apprenticeCount: number;
}

export interface Term {
	id: string;
	name: string;
	startingDate: string;
	endDate: string;
}

export interface StaffRecord {
	id: string;
	name: string;
	email: string;
	learnerEmail: string | null; // Email of linked apprentice, if staff is also an apprentice
	externalAccessEmail?: string; // Email for external staff login access
	externalAccessName?: string; // Display name for external staff
}

export type UserType = 'staff' | 'student' | 'external';

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
	 * Get staff record by email, including linked learner email if staff is also an apprentice
	 */
	async function getStaffByEmail(email: string): Promise<StaffRecord | null> {
		const staffTable = base(TABLES.STAFF);

		// singleCollaborator field cannot be filtered, must fetch all and iterate
		const staffRecords = await staffTable
			.select({
				returnFieldsByFieldId: true,
			})
			.all();

		for (const record of staffRecords) {
			const collaborator = record.get(STAFF_FIELDS.COLLABORATOR) as { id: string; email: string; name: string } | undefined;
			if (collaborator?.email?.toLowerCase() === email.toLowerCase()) {
				const learnerEmailLookup = record.get(STAFF_FIELDS.LEARNER_EMAIL) as string[] | undefined;
				const externalAccessEmail = record.get(STAFF_FIELDS.EXTERNAL_ACCESS_EMAIL) as string | undefined;
				const externalAccessName = record.get(STAFF_FIELDS.EXTERNAL_ACCESS_NAME) as string | undefined;
				return {
					id: record.id,
					name: collaborator.name,
					email: collaborator.email,
					learnerEmail: learnerEmailLookup?.[0] ?? null,
					externalAccessEmail,
					externalAccessName,
				};
			}
		}

		return null;
	}

	/**
	 * Check if email exists in Staff table
	 */
	async function findStaffByEmail(email: string): Promise<boolean> {
		const staff = await getStaffByEmail(email);
		return staff !== null;
	}

	/**
	 * Get external user by email from external access fields
	 */
	async function getExternalAccessByEmail(email: string): Promise<{ type: 'external'; email: string; name: string; accessLevel: 'attendance-view' } | null> {
		const staffTable = base(TABLES.STAFF);

		try {
			// We need to fetch all staff records and check the external access email field
			// since email fields cannot be filtered directly in Airtable
			const staffRecords = await staffTable
				.select({
					returnFieldsByFieldId: true,
				})
				.all();

			for (const record of staffRecords) {
				const externalAccessEmail = record.get(STAFF_FIELDS.EXTERNAL_ACCESS_EMAIL) as string | undefined;
				const externalAccessName = record.get(STAFF_FIELDS.EXTERNAL_ACCESS_NAME) as string | undefined;

				// Check if the email matches the external access email field
				if (externalAccessEmail?.toLowerCase() === email.toLowerCase()) {
					return {
						type: 'external',
						email: externalAccessEmail,
						name: externalAccessName || 'External User',
						accessLevel: 'attendance-view',
					};
				}
			}

			return null;
		}
		catch (error) {
			console.error('Error fetching external access user:', error);
			return null;
		}
	}

	/**
	 * Check if email exists in Apprentices table (case-insensitive)
	 * Note: filterByFormula requires field NAME "Learner email" - this would break if renamed in Airtable
	 */
	async function findApprenticeByEmail(email: string): Promise<boolean> {
		const apprenticesTable = base(TABLES.APPRENTICES);

		const apprenticeRecords = await apprenticesTable
			.select({
				filterByFormula: `LOWER({Learner email}) = LOWER("${email}")`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		return apprenticeRecords.length > 0;
	}

	/**
	 * Get apprentice record by email (includes cohort ID for check-in)
	 */
	async function getApprenticeByEmail(email: string): Promise<ApprenticeRecord | null> {
		const apprenticesTable = base(TABLES.APPRENTICES);

		const records = await apprenticesTable
			.select({
				filterByFormula: `LOWER({Learner email}) = LOWER("${email}")`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (records.length === 0) {
			return null;
		}

		const record = records[0];
		const emailLookup = record.get(APPRENTICE_FIELDS.EMAIL) as string[] | undefined;
		const cohortLink = record.get(APPRENTICE_FIELDS.COHORT) as string[] | undefined;

		return {
			id: record.id,
			name: record.get(APPRENTICE_FIELDS.NAME) as string,
			email: emailLookup?.[0] ?? email,
			cohortIds: cohortLink ?? [],
		};
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

		return records.map((record) => {
			const apprenticeIds = record.get(COHORT_FIELDS.APPRENTICES) as string[] | undefined;
			return {
				id: record.id,
				name: (record.get(COHORT_FIELDS.NUMBER) as string) || record.id,
				apprenticeCount: apprenticeIds?.length ?? 0,
			};
		});
	}

	/**
	 * List all terms
	 */
	async function listTerms(): Promise<Term[]> {
		const termsTable = base(TABLES.TERMS);

		const records = await termsTable
			.select({
				returnFieldsByFieldId: true,
				sort: [{ field: TERM_FIELDS.STARTING_DATE, direction: 'desc' }],
			})
			.all();

		return records.map((record) => {
			return {
				id: record.id,
				name: (record.get(TERM_FIELDS.NAME) as string) || record.id,
				startingDate: (record.get(TERM_FIELDS.STARTING_DATE) as string) || '',
				endDate: (record.get(TERM_FIELDS.END_DATE) as string) || '',
			};
		});
	}

	/**
	 * Get apprentices by cohort record ID
	 */
	async function getApprenticesByCohortId(cohortId: string): Promise<ApprenticeRecord[]> {
		const cohortsTable = base(TABLES.COHORTS);
		const apprenticesTable = base(TABLES.APPRENTICES);

		// Get the cohort to find linked apprentice IDs
		const cohortRecords = await cohortsTable
			.select({
				filterByFormula: `RECORD_ID() = "${cohortId}"`,
				maxRecords: 1,
				returnFieldsByFieldId: true,
			})
			.all();

		if (cohortRecords.length === 0) {
			return [];
		}

		const apprenticeIds = cohortRecords[0].get(COHORT_FIELDS.APPRENTICES) as string[] | undefined;
		if (!apprenticeIds || apprenticeIds.length === 0) {
			return [];
		}

		// Fetch apprentice details
		const recordIdFormula = apprenticeIds.map(id => `RECORD_ID() = "${id}"`).join(', ');
		const records = await apprenticesTable
			.select({
				filterByFormula: `OR(${recordIdFormula})`,
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			const emailLookup = record.get(APPRENTICE_FIELDS.EMAIL) as string[] | undefined;
			const cohortLink = record.get(APPRENTICE_FIELDS.COHORT) as string[] | undefined;
			return {
				id: record.id,
				name: record.get(APPRENTICE_FIELDS.NAME) as string,
				email: emailLookup?.[0] ?? '',
				cohortIds: cohortLink ?? [],
			};
		});
	}

	/**
	 * Get apprentices by their record IDs
	 */
	async function getApprenticesByIds(ids: string[]): Promise<ApprenticeRecord[]> {
		if (ids.length === 0) {
			return [];
		}

		const apprenticesTable = base(TABLES.APPRENTICES);

		const recordIdFormula = ids.map(id => `RECORD_ID() = "${id}"`).join(', ');
		const records = await apprenticesTable
			.select({
				filterByFormula: `OR(${recordIdFormula})`,
				returnFieldsByFieldId: true,
			})
			.all();

		return records.map((record) => {
			const emailLookup = record.get(APPRENTICE_FIELDS.EMAIL) as string[] | undefined;
			const cohortLink = record.get(APPRENTICE_FIELDS.COHORT) as string[] | undefined;
			return {
				id: record.id,
				name: record.get(APPRENTICE_FIELDS.NAME) as string,
				email: emailLookup?.[0] ?? '',
				cohortIds: cohortLink ?? [],
			};
		});
	}

	return {
		getApprenticesByFacCohort,
		findUserByEmail,
		findStaffByEmail,
		getStaffByEmail,
		getExternalAccessByEmail,
		findApprenticeByEmail,
		getApprenticeByEmail,
		listCohorts,
		listTerms,
		getApprenticesByCohortId,
		getApprenticesByIds,
	};
}
