import Airtable from 'airtable';
import 'dotenv/config';

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
  const learnersBase = Airtable.base(baseIdLearners);
  
  // List first table's records (you'll need to replace 'Table 1' with actual table name)
  const records = await learnersBase('Table 1').select({ maxRecords: 3 }).all();
  console.log(`Found ${records.length} records`);
  
  console.log('\nConnection successful!');
}

testConnection().catch(console.error);