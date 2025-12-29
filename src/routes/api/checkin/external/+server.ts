import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getEvent,
	findApprenticeByEmail,
	createExternalAttendance,
	hasExternalCheckedIn,
} from '$lib/airtable/sveltekit-wrapper';

export const POST: RequestHandler = async ({ request }) => {
	let body: { eventId?: string; name?: string; email?: string; code?: string };
	try {
		body = await request.json();
	}
	catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const { eventId, name, email, code } = body;

	// Validate required fields
	if (!eventId) {
		return json({ success: false, error: 'eventId is required' }, { status: 400 });
	}
	if (!name || name.trim().length === 0) {
		return json({ success: false, error: 'name is required' }, { status: 400 });
	}
	if (!email) {
		return json({ success: false, error: 'email is required' }, { status: 400 });
	}
	if (!code) {
		return json({ success: false, error: 'code is required' }, { status: 400 });
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return json({ success: false, error: 'Invalid email format' }, { status: 400 });
	}

	// Validate code format (4 digits)
	const codeNum = parseInt(code, 10);
	if (isNaN(codeNum) || codeNum < 1000 || codeNum > 9999) {
		return json({ success: false, error: 'Code must be a 4-digit number' }, { status: 400 });
	}

	try {
		// Get the event and verify it exists and is public
		const event = await getEvent(eventId);
		if (!event) {
			return json({ success: false, error: 'Event not found' }, { status: 404 });
		}

		if (!event.isPublic) {
			return json({ success: false, error: 'This event is not open for guest check-in' }, { status: 403 });
		}

		// Verify the code matches the event
		if (event.checkInCode !== codeNum) {
			return json({ success: false, error: 'Invalid check-in code for this event' }, { status: 400 });
		}

		// Check if email belongs to a registered apprentice
		const isRegistered = await findApprenticeByEmail(email);
		if (isRegistered) {
			return json({
				success: false,
				isRegisteredUser: true,
				error: 'This email is registered. Please log in to check in.',
			}, { status: 409 });
		}

		// Check if already checked in
		const alreadyCheckedIn = await hasExternalCheckedIn(eventId, email);
		if (alreadyCheckedIn) {
			return json({ success: false, error: 'Already checked in to this event' }, { status: 409 });
		}

		// Create external attendance
		const attendance = await createExternalAttendance({
			eventId,
			name: name.trim(),
			email: email.toLowerCase(),
		});

		return json({
			success: true,
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
	catch (error) {
		console.error('Failed to check in external user:', error);
		return json({ success: false, error: 'Failed to check in' }, { status: 500 });
	}
};
