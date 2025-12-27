/**
 * Manual test script for Events CRUD operations.
 * Run with: npx tsx scripts/test-events.ts
 */

import { createEventsClient } from '../src/lib/airtable/events.ts';
import { config } from 'dotenv';
config({ path: '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY!;
const baseId = process.env.AIRTABLE_BASE_ID_LEARNERS!;

if (!apiKey || !baseId) {
	console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID_LEARNERS');
	process.exit(1);
}

const client = createEventsClient(apiKey, baseId);

async function main() {
	console.log('=== Testing Events CRUD ===\n');

	// List events
	console.log('1. Listing events...');
	const events = await client.listEvents();
	console.log(`   Found ${events.length} events`);
	if (events.length > 0) {
		console.log('   First event:', events[0]);
	}

	// Get single event (if any exist)
	if (events.length > 0) {
		console.log('\n2. Getting single event...');
		const event = await client.getEvent(events[0].id);
		console.log('   Event:', event);
	}

	// Uncomment below to test create/update/delete (will modify Airtable!)
	/*
	console.log('\n3. Creating event...');
	const newEvent = await client.createEvent({
		name: 'Test Event',
		dateTime: new Date().toISOString(),
		cohortId: 'YOUR_COHORT_RECORD_ID',
		eventType: 'Workshop',
	});
	console.log('   Created:', newEvent);

	console.log('\n4. Updating event...');
	const updated = await client.updateEvent(newEvent.id, { name: 'Updated Test Event' });
	console.log('   Updated:', updated);

	console.log('\n5. Deleting event...');
	await client.deleteEvent(newEvent.id);
	console.log('   Deleted');
	*/

	console.log('\n=== Done ===');
}

main().catch(console.error);
