import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEvent, listEvents } from '$lib/airtable/sveltekit-wrapper';
import { EVENT_TYPES } from '$lib/types/event';

export const GET: RequestHandler = async () => {
	try {
		const events = await listEvents();
		return json({ success: true, events });
	}
	catch (error) {
		console.error('Failed to list events:', error);
		return json({ success: false, error: 'Failed to list events' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		// Validate required fields
		if (!body.name?.trim()) {
			return json({ success: false, error: 'Name is required' }, { status: 400 });
		}
		if (!body.dateTime) {
			return json({ success: false, error: 'Date/time is required' }, { status: 400 });
		}
		if (!body.eventType) {
			return json({ success: false, error: 'Event type is required' }, { status: 400 });
		}

		// Case-insensitive event type matching - normalize to Airtable's exact value
		const normalizedEventType = EVENT_TYPES.find(
			t => t.toLowerCase() === body.eventType.toLowerCase(),
		);
		if (!normalizedEventType) {
			return json({ success: false, error: 'Invalid event type' }, { status: 400 });
		}

		const event = await createEvent({
			name: body.name.trim(),
			dateTime: body.dateTime,
			cohortId: body.cohortId || undefined,
			eventType: normalizedEventType,
			surveyUrl: body.surveyUrl || undefined,
			isPublic: body.isPublic ?? false,
			checkInCode: body.checkInCode || undefined,
		});

		return json({ success: true, event });
	}
	catch (error) {
		console.error('Failed to create event:', error);
		return json({ success: false, error: 'Failed to create event' }, { status: 500 });
	}
};
