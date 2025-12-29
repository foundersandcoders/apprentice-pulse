import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateEvent, deleteEvent, getEvent } from '$lib/airtable/sveltekit-wrapper';
import type { EventType } from '$lib/types/event';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;

		// Check event exists
		const existing = await getEvent(id);
		if (!existing) {
			return json({ success: false, error: 'Event not found' }, { status: 404 });
		}

		const body = await request.json();

		// Validate event type if provided
		if (body.eventType) {
			const validEventTypes: EventType[] = ['Regular class', 'Workshop', 'Hackathon'];
			if (!validEventTypes.includes(body.eventType)) {
				return json({ success: false, error: 'Invalid event type' }, { status: 400 });
			}
		}

		const event = await updateEvent(id, {
			name: body.name?.trim() || undefined,
			dateTime: body.dateTime || undefined,
			cohortId: body.cohortId,
			eventType: body.eventType || undefined,
			surveyUrl: body.surveyUrl,
			isPublic: body.isPublic,
			checkInCode: body.checkInCode,
		});

		return json({ success: true, event });
	}
	catch (error) {
		console.error('Failed to update event:', error);
		return json({ success: false, error: 'Failed to update event' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		// Check event exists
		const existing = await getEvent(id);
		if (!existing) {
			return json({ success: false, error: 'Event not found' }, { status: 404 });
		}

		await deleteEvent(id);

		return json({ success: true });
	}
	catch (error) {
		console.error('Failed to delete event:', error);
		return json({ success: false, error: 'Failed to delete event' }, { status: 500 });
	}
};
