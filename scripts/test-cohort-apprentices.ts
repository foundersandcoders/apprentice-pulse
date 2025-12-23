import dotenv from 'dotenv';
import { createAirtableClient } from '../src/lib/airtable/airtable.ts';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY;
const baseIdLearners = process.env.AIRTABLE_BASE_ID_LEARNERS;

if (!apiKey || !baseIdLearners) {
	console.error('Missing environment variables');
	process.exit(1);
}

const client = createAirtableClient(apiKey, baseIdLearners);

async function main() {
	const facCohort = process.argv[2] || 'FAC23';
	console.log(`\nLooking for FAC Cohort: ${facCohort}...`);

	const apprentices = await client.getApprenticesByFacCohort(facCohort);

	if (apprentices.length === 0) {
		console.log('No apprentices found for this FAC Cohort');
		return;
	}

	console.log(`\nFound ${apprentices.length} apprentices in ${facCohort}:\n`);

	for (const apprentice of apprentices) {
		console.log(`  - ${apprentice.name} (${apprentice.status || 'No status'}) - ${apprentice.email || 'No email'}`);
	}

	console.log('\n✅ Done!');
}

main().catch(console.error);
