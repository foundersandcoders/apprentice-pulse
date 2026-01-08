import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { eventTypesService } from '$lib/services/event-types';

export const GET: RequestHandler = async () => {
	try {
		const eventTypes = await eventTypesService.getEventTypes();
		return json({ success: true, eventTypes });
	}
	catch (error) {
		console.error('Failed to fetch event types:', error);
		return json({ success: false, error: 'Failed to fetch event types' }, { status: 500 });
	}
};
