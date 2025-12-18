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

async function testConnection() {
	const base = Airtable.base(baseIdLearners ?? '');
	const table = base('Test for Apprentice-pulse');

	console.log('Testing write access...');
	const newRecord = await table.create({
		Name: 'Test Record',
	});
	console.log('Created record:', newRecord.id);

	console.log('\nTesting read access...');
	const records = await table.select({ maxRecords: 3 }).all();
	console.log(`Found ${records.length} records:`);
	records.forEach((record) => {
		console.log(`  - ${record.id}: ${record.get('Name')}`);
	});

	// console.log('\nTesting delete...');
	// await table.destroy(newRecord.id);
	// console.log('Deleted test record');

	console.log('\n✅ All tests passed!');
}

testConnection().catch(console.error);
