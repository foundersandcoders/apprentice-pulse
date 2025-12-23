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

// Table: Test for Apprentice-pulse
const TABLE_ID = 'tblTT4yIfKbVurrPf';
// Field: Name
const FIELD_NAME = 'fldJummyNwMjpr3Vr';

async function testConnection() {
	const base = Airtable.base(baseIdLearners ?? '');
	const table = base(TABLE_ID);

	console.log('Testing write access...');
	const newRecord = await table.create({
		[FIELD_NAME]: 'Test Record',
	});
	console.log('Created record:', newRecord.id);

	console.log('\nTesting read access...');
	const records = await table.select({ maxRecords: 3 }).all();
	console.log(`Found ${records.length} records:`);
	records.forEach((record) => {
		console.log(`  - ${record.id}: ${record.get(FIELD_NAME)}`);
	});

	// console.log('\nTesting delete...');
	// await table.destroy(newRecord.id);
	// console.log('Deleted test record');

	console.log('\n✅ All tests passed!');
}

testConnection().catch(console.error);
