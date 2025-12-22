import Airtable from 'airtable';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS } from '$env/static/private';

// Configure Airtable
Airtable.configure({ apiKey: AIRTABLE_API_KEY });

const base = Airtable.base(AIRTABLE_BASE_ID_LEARNERS);

// Table IDs
const COHORTS_TABLE = 'tbllAnSw8VPYFAa1a';
const APPRENTICES_TABLE = 'tbl0HJM700Jmd5Oob';

// Field IDs - Cohorts
const COHORT_NUMBER_FIELD = 'fldqWsDL2oqnonvZg';
const COHORT_APPRENTICES_FIELD = 'fldF2zEQCRaWglKl0';

// Field IDs - Apprentices
const APPRENTICE_NAME_FIELD = 'fldtvHx7pP5FgUWvh';
const APPRENTICE_STATUS_FIELD = 'fldFP9b6CfhNzeVNQ';
const APPRENTICE_EMAIL_FIELD = 'fldC3xdKGd96U0aoZ'; // Learner email (lookup field)

export interface Apprentice {
	id: string;
	name: string;
	email: string | null;
	status: string | null;
	cohortNumber: string | null;
}

/**
 * Get all apprentices for a FAC Cohort (e.g., "FAC29" returns apprentices from FAC29.1, FAC29.2, etc.)
 *
 * Note: filterByFormula requires field NAME "FAC Cohort" - this would break if renamed in Airtable
 */
export async function getApprenticesByFacCohort(facCohort: string): Promise<Apprentice[]> {
	const cohortsTable = base(COHORTS_TABLE);
	const apprenticesTable = base(APPRENTICES_TABLE);

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
		const cohortNum = cohort.get(COHORT_NUMBER_FIELD) as string | undefined;
		const apprenticeIds = cohort.get(COHORT_APPRENTICES_FIELD) as string[] | undefined;
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
		const emailLookup = record.get(APPRENTICE_EMAIL_FIELD) as string[] | undefined;
		return {
			id: record.id,
			name: record.get(APPRENTICE_NAME_FIELD) as string,
			email: emailLookup?.[0] ?? null,
			status: (record.get(APPRENTICE_STATUS_FIELD) as string) || null,
			cohortNumber: apprenticeMap.get(record.id) ?? null,
		};
	});
}
