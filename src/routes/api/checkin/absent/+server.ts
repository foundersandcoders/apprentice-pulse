import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSession } from '$lib/server/session';
import { getApprenticeByEmail, getStaffByEmail, markNotComing } from '$lib/airtable/sveltekit-wrapper';

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
		// Only registered apprentices can mark "Absent"
		// First try direct email lookup
		let apprentice = await getApprenticeByEmail(session.email);

		// If not found, check if user is staff with linked learner email
		if (!apprentice) {
			const staff = await getStaffByEmail(session.email);
			if (staff?.learnerEmail) {
				apprentice = await getApprenticeByEmail(staff.learnerEmail);
			}
		}

		if (!apprentice) {
			return json({
				success: false,
				error: 'Only registered apprentices can mark as absent',
			}, { status: 403 });
		}

		const attendance = await markNotComing({
			eventId,
			apprenticeId: apprentice.id,
		});

		return json({
			success: true,
			attendance: {
				id: attendance.id,
				eventId: attendance.eventId,
				apprenticeId: attendance.apprenticeId,
				status: attendance.status,
			},
		});
	}
	catch (error) {
		console.error('Failed to mark as absent:', error);
		const message = error instanceof Error ? error.message : 'Failed to mark as absent';
		return json({ success: false, error: message }, { status: 500 });
	}
};
