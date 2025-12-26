import Airtable from 'airtable';
import { config } from 'dotenv';
config({ path: '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY;
const baseIdLearners = process.env.AIRTABLE_BASE_ID_LEARNERS;

if (!apiKey || !baseIdLearners) {
	console.error('Missing environment variables');
	process.exit(1);
}

Airtable.configure({ apiKey });
const base = Airtable.base(baseIdLearners);

const STAFF_TABLE_ID = 'tblJjn62ExE1LVjmx';

async function main() {
	console.log('\nFetching staff members...\n');

	const records = await base(STAFF_TABLE_ID)
		.select({ returnFieldsByFieldId: true })
		.all();

	console.log(`Found ${records.length} staff members:\n`);

	for (const record of records) {
		console.log('--- Record ---');
		console.log('Raw fields:', JSON.stringify(record.fields, null, 2));
		console.log('');
	}

	console.log('✅ Done!');
}

main().catch(console.error);
