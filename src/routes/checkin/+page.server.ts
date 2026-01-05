import type { PageServerLoad } from './$types';
import { getApprenticeByEmail, listEvents, hasUserCheckedIn, hasExternalCheckedIn } from '$lib/airtable/sveltekit-wrapper';

export interface CheckinEvent {
	id: string;
	name: string;
	dateTime: string;
	eventType: string;
	isPublic: boolean;
	alreadyCheckedIn: boolean;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	// Not authenticated - return minimal data for guest mode
	if (!user) {
		return {
			authenticated: false,
			events: [] as CheckinEvent[],
			checkInMethod: null,
		};
	}

	// Authenticated - fetch events based on apprentice record
	const apprentice = await getApprenticeByEmail(user.email);

	// Get events - filter by cohort if apprentice has one
	const now = new Date();
	const allEvents = await listEvents({
		startDate: now.toISOString().split('T')[0],
	});

	// Filter events based on user type
	let availableEvents;
	if (apprentice?.cohortId) {
		// User with apprentice record: show cohort events + public events
		availableEvents = allEvents.filter(
			event => event.cohortIds.includes(apprentice.cohortId!) || event.isPublic,
		);
	}
	else {
		// Staff without apprentice record: show public events only
		availableEvents = allEvents.filter(event => event.isPublic);
	}

	// Check attendance status for each event
	const eventsWithStatus: CheckinEvent[] = await Promise.all(
		availableEvents.map(async (event) => {
			let alreadyCheckedIn = false;

			if (apprentice) {
				alreadyCheckedIn = await hasUserCheckedIn(event.id, apprentice.id);
			}
			else {
				alreadyCheckedIn = await hasExternalCheckedIn(event.id, user.email);
			}

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

	return {
		authenticated: true,
		events: eventsWithStatus,
		checkInMethod: apprentice ? 'apprentice' : 'external',
	};
};
