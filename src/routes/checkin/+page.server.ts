import type { PageServerLoad } from './$types';
import { getApprenticeByEmail, listEvents, listCohorts, getUserAttendanceForEvent, hasExternalCheckedIn } from '$lib/airtable/sveltekit-wrapper';

export type AttendanceStatusUI = 'none' | 'checked-in' | 'not-coming';

export interface CheckinEvent {
	id: string;
	name: string;
	dateTime: string;
	eventType: string;
	isPublic: boolean;
	attendanceStatus: AttendanceStatusUI;
	attendanceCount: number;
	expectedCount: number;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;

	// Not authenticated - return minimal data for guest mode
	if (!user) {
		return {
			authenticated: false,
			events: [] as CheckinEvent[],
			checkInMethod: null,
			user: null,
		};
	}

	// Authenticated - fetch events based on apprentice record
	const apprentice = await getApprenticeByEmail(user.email);

	// Get events and cohorts
	const now = new Date();
	const [allEvents, cohorts] = await Promise.all([
		listEvents({ startDate: now.toISOString().split('T')[0] }),
		listCohorts(),
	]);

	// Build cohort lookup for expected counts
	const cohortApprenticeCount = new Map(cohorts.map(c => [c.id, c.apprenticeCount]));

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
			let attendanceStatus: AttendanceStatusUI = 'none';

			if (apprentice) {
				const attendance = await getUserAttendanceForEvent(event.id, apprentice.id);
				if (attendance) {
					attendanceStatus = attendance.status === 'Not Coming' ? 'not-coming' : 'checked-in';
				}
			}
			else {
				const hasCheckedIn = await hasExternalCheckedIn(event.id, user.email);
				if (hasCheckedIn) {
					attendanceStatus = 'checked-in';
				}
			}

			// Calculate expected count from cohorts
			const expectedCount = event.cohortIds.reduce(
				(sum, cohortId) => sum + (cohortApprenticeCount.get(cohortId) || 0),
				0,
			);

			return {
				id: event.id,
				name: event.name,
				dateTime: event.dateTime,
				eventType: event.eventType,
				isPublic: event.isPublic,
				attendanceStatus,
				attendanceCount: event.attendanceCount ?? 0,
				expectedCount,
			};
		}),
	);

	// Sort by date (most recent first)
	eventsWithStatus.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

	return {
		authenticated: true,
		events: eventsWithStatus,
		checkInMethod: apprentice ? 'apprentice' : 'external',
		user: {
			name: apprentice?.name || null,
			email: user.email,
		},
	};
};
