import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/session';
import {
	getApprenticeByEmail,
	createAttendance,
	createExternalAttendance,
	hasUserCheckedIn,
	hasExternalCheckedIn,
} from '$lib/airtable/sveltekit-wrapper';

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
			const alreadyCheckedIn = await hasUserCheckedIn(eventId, apprentice.id);
			if (alreadyCheckedIn) {
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
