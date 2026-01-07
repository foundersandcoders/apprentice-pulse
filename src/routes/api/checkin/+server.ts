import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/session';
import {
	getApprenticeByEmail,
	createAttendance,
	createExternalAttendance,
	getUserAttendanceForEvent,
	hasExternalCheckedIn,
	updateAttendance,
	getEvent,
} from '$lib/airtable/sveltekit-wrapper';

/**
 * Determine attendance status based on check-in time vs event start time
 */
function determineStatus(eventDateTime: string | null): 'Present' | 'Late' {
	if (!eventDateTime) {
		return 'Present';
	}
	const eventTime = new Date(eventDateTime);
	const now = new Date();
	return now > eventTime ? 'Late' : 'Present';
}

export const POST: RequestHandler = async ({ cookies, request }) => {
	const session = getSession(cookies);

	if (!session) {
		return json({ success: false, error: 'Authentication required' }, { status: 401 });
	}

	let body: { eventId?: string };
	try {
		body = await request.json();
	}
	catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const { eventId } = body;

	if (!eventId) {
		return json({ success: false, error: 'eventId is required' }, { status: 400 });
	}

	try {
		// Check if user has an apprentice record
		const apprentice = await getApprenticeByEmail(session.email);

		if (apprentice) {
			// Apprentice flow: check in using apprentice ID
			const existingAttendance = await getUserAttendanceForEvent(eventId, apprentice.id);

			if (existingAttendance) {
				// Handle "Absent" → "Check In" transition
				if (existingAttendance.status === 'Absent') {
					const event = await getEvent(eventId);
					const status = determineStatus(event?.dateTime ?? null);

					const updatedAttendance = await updateAttendance(existingAttendance.id, {
						status,
						checkinTime: new Date().toISOString(),
					});

					return json({
						success: true,
						checkInMethod: 'apprentice',
						attendance: {
							id: updatedAttendance.id,
							eventId: updatedAttendance.eventId,
							apprenticeId: updatedAttendance.apprenticeId,
							checkinTime: updatedAttendance.checkinTime,
							status: updatedAttendance.status,
						},
					});
				}

				// Already checked in with another status
				return json({ success: false, error: 'Already checked in to this event' }, { status: 409 });
			}

			const attendance = await createAttendance({
				eventId,
				apprenticeId: apprentice.id,
			});

			return json({
				success: true,
				checkInMethod: 'apprentice',
				attendance: {
					id: attendance.id,
					eventId: attendance.eventId,
					apprenticeId: attendance.apprenticeId,
					checkinTime: attendance.checkinTime,
					status: attendance.status,
				},
			});
		}
		else {
			// External flow: check in using session email (staff without apprentice record)
			const alreadyCheckedIn = await hasExternalCheckedIn(eventId, session.email);
			if (alreadyCheckedIn) {
				return json({ success: false, error: 'Already checked in to this event' }, { status: 409 });
			}

			const attendance = await createExternalAttendance({
				eventId,
				name: session.email.split('@')[0], // Use email prefix as name
				email: session.email,
			});

			return json({
				success: true,
				checkInMethod: 'external',
				attendance: {
					id: attendance.id,
					eventId: attendance.eventId,
					externalName: attendance.externalName,
					externalEmail: attendance.externalEmail,
					checkinTime: attendance.checkinTime,
					status: attendance.status,
				},
			});
		}
	}
	catch (error) {
		console.error('Failed to check in:', error);
		return json({ success: false, error: 'Failed to check in' }, { status: 500 });
	}
};
