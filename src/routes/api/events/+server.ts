import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEvent } from '$lib/airtable/sveltekit-wrapper';
import type { EventType } from '$lib/types/event';

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

		// Validate event type
		const validEventTypes: EventType[] = ['Regular class', 'Workshop', 'Hackathon'];
		if (!validEventTypes.includes(body.eventType)) {
			return json({ success: false, error: 'Invalid event type' }, { status: 400 });
		}

		const event = await createEvent({
			name: body.name.trim(),
			dateTime: body.dateTime,
			cohortId: body.cohortId || undefined,
			eventType: body.eventType,
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
