import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/session';
import {
	getApprenticeByEmail,
	listEvents,
	hasUserCheckedIn,
	hasExternalCheckedIn,
} from '$lib/airtable/sveltekit-wrapper';

export const GET: RequestHandler = async ({ cookies }) => {
	const session = getSession(cookies);

	if (!session) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	try {
		// Try to get apprentice record (works for students and staff who are also apprentices)
		const apprentice = await getApprenticeByEmail(session.email);

		// Get upcoming events (from today onwards)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const allEvents = await listEvents({ startDate: today.toISOString() });

		if (apprentice) {
			// User has apprentice record: show cohort + public events
			const relevantEvents = allEvents.filter(
				event => event.isPublic || (apprentice.cohortId && event.cohortIds.includes(apprentice.cohortId)),
			);

			// Check attendance status for each event
			const eventsWithStatus = await Promise.all(
				relevantEvents.map(async (event) => {
					const alreadyCheckedIn = await hasUserCheckedIn(event.id, apprentice.id);
					return {
						id: event.id,
						name: event.name,
						dateTime: event.dateTime,
						eventType: event.eventType,
						isPublic: event.isPublic,
						alreadyCheckedIn,
					};
				}),
			);

			return json({
				success: true,
				checkInMethod: 'apprentice',
				apprenticeId: apprentice.id,
				apprenticeName: apprentice.name,
				events: eventsWithStatus,
			});
		}
		else {
			// No apprentice record (staff without apprentice): show public events only
			const publicEvents = allEvents.filter(event => event.isPublic);

			// Check attendance status by email
			const eventsWithStatus = await Promise.all(
				publicEvents.map(async (event) => {
					const alreadyCheckedIn = await hasExternalCheckedIn(event.id, session.email);
					return {
						id: event.id,
						name: event.name,
						dateTime: event.dateTime,
						eventType: event.eventType,
						isPublic: event.isPublic,
						alreadyCheckedIn,
					};
				}),
			);

			return json({
				success: true,
				checkInMethod: 'external',
				email: session.email,
				events: eventsWithStatus,
			});
		}
	}
	catch (error) {
		console.error('Failed to get check-in events:', error);
		return json({ success: false, error: 'Failed to get events' }, { status: 500 });
	}
};
