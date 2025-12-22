import Airtable from 'airtable';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY;
const baseIdLearners = process.env.AIRTABLE_BASE_ID_LEARNERS;

if (!apiKey || !baseIdLearners) {
	console.error('Missing environment variables');
	process.exit(1);
}

Airtable.configure({ apiKey });

// Table: Cohorts
const COHORTS_TABLE_ID = 'tbllAnSw8VPYFAa1a';
const COHORT_NUMBER_FIELD = 'fldqWsDL2oqnonvZg';
const COHORT_APPRENTICES_FIELD = 'fldF2zEQCRaWglKl0';

// Table: Apprentices
const APPRENTICES_TABLE_ID = 'tbl0HJM700Jmd5Oob';
const APPRENTICE_NAME_FIELD = 'fldtvHx7pP5FgUWvh';
const APPRENTICE_STATUS_FIELD = 'fldFP9b6CfhNzeVNQ';

async function getApprenticesByFacCohort(facCohort: string) {
	const base = Airtable.base(baseIdLearners ?? '');
	const cohortsTable = base(COHORTS_TABLE_ID);
	const apprenticesTable = base(APPRENTICES_TABLE_ID);

	// Step 1: Find all cohorts that belong to the FAC Cohort (e.g., FAC29 includes FAC29.1, FAC29.2, etc.)
	console.log(`\nLooking for FAC Cohort: ${facCohort}...`);
	// Note: filterByFormula still requires field NAME (Airtable limitation)
	// But returnFieldsByFieldId makes record.get() work with field IDs
	const cohorts = await cohortsTable
		.select({
			filterByFormula: `{FAC Cohort} = "${facCohort}"`,
			returnFieldsByFieldId: true,
		})
		.all();

	if (cohorts.length === 0) {
		console.error(`FAC Cohort "${facCohort}" not found`);
		return;
	}

	console.log(`Found ${cohorts.length} cohort(s) in ${facCohort}`);

	// Step 2: Collect all apprentice IDs from all matching cohorts
	const allApprenticeIds: string[] = [];
	for (const cohort of cohorts) {
		const cohortNum = cohort.get(COHORT_NUMBER_FIELD);
		const apprenticeIds = cohort.get(COHORT_APPRENTICES_FIELD) as string[] | undefined;
		if (apprenticeIds && apprenticeIds.length > 0) {
			console.log(`  - ${cohortNum}: ${apprenticeIds.length} apprentices`);
			allApprenticeIds.push(...apprenticeIds);
		}
	}

	if (allApprenticeIds.length === 0) {
		console.log('No apprentices linked to this FAC Cohort');
		return;
	}

	console.log(`\nTotal: ${allApprenticeIds.length} apprentices in ${facCohort}:\n`);

	// Step 3: Fetch apprentices using select with returnFieldsByFieldId
	// Build OR formula to fetch all apprentices in one query
	const recordIdFormula = allApprenticeIds.map(id => `RECORD_ID() = "${id}"`).join(', ');
	const apprentices = await apprenticesTable
		.select({
			filterByFormula: `OR(${recordIdFormula})`,
			returnFieldsByFieldId: true,
		})
		.all();

	for (const apprentice of apprentices) {
		const name = apprentice.get(APPRENTICE_NAME_FIELD);
		const status = apprentice.get(APPRENTICE_STATUS_FIELD);
		console.log(`  - ${name} (${status || 'No status'})`);
	}

	console.log('\n✅ Done!');
}

// Get FAC Cohort from command line argument or use default
const facCohort = process.argv[2] || 'FAC23';
getApprenticesByFacCohort(facCohort).catch(console.error);
