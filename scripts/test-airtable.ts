import Airtable from 'airtable';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY;
const baseIdLearners = process.env.AIRTABLE_BASE_ID_LEARNERS;
const baseIdFeedback = process.env.AIRTABLE_BASE_ID_FEEDBACK;

if (!apiKey || !baseIdLearners || !baseIdFeedback) {
	console.error('Missing environment variables');
	process.exit(1);
}

Airtable.configure({ apiKey });

async function testConnection() {
	console.log('Testing Learners base...');
	console.log('API Key starts with:', apiKey?.substring(0, 10));
	console.log('Learners Base ID:', baseIdLearners);
	const learnersBase = Airtable.base(baseIdLearners ?? '');

	const records = await learnersBase('Attendance (Current)').select().all();
	console.log(`Found ${records.length} records`);

	console.log('\nTesting write access...');
	const newRecord = await learnersBase('Attendance (Current)').create({
		Apprentice: 'Alexander Rodriguez',
		Cohort: 'FAC29',
	});
	console.log('Created record:', newRecord.id);

	console.log('\nConnection successful!');
}

testConnection().catch(console.error);
