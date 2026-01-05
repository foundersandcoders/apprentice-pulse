import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AttendanceStatus } from '$lib/types/attendance';
import { getSession } from '$lib/server/session';
import { createAttendance, updateAttendance } from '$lib/airtable/sveltekit-wrapper';
import { ATTENDANCE_STATUSES } from '$lib/types/attendance';

/**
 * POST /api/attendance - Staff creates attendance record for an apprentice
 * Used when staff manually checks in an apprentice who hasn't checked in yet
 * Optionally accepts status and checkinTime for manual override
 */
export const POST: RequestHandler = async ({ cookies, request }) => {
	const session = getSession(cookies);

	// Only staff can create attendance records for others
	if (!session || session.type !== 'staff') {
		return json({ success: false, error: 'Staff authentication required' }, { status: 401 });
	}

	let body: { eventId?: string; apprenticeId?: string; status?: AttendanceStatus; checkinTime?: string };
	try {
		body = await request.json();
	}
	catch {
		return json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
	}

	const { eventId, apprenticeId, status, checkinTime } = body;

	if (!eventId || !apprenticeId) {
		return json({ success: false, error: 'eventId and apprenticeId are required' }, { status: 400 });
	}

	// Validate status if provided
	if (status && !ATTENDANCE_STATUSES.includes(status)) {
		return json({ success: false, error: 'Invalid status' }, { status: 400 });
	}

	try {
		// First create the attendance record (auto-determines Present/Late)
		let attendance = await createAttendance({ eventId, apprenticeId });

		// If a specific status was requested and it differs, update it
		if (status && status !== attendance.status) {
			attendance = await updateAttendance(attendance.id, {
				status,
				checkinTime: checkinTime ?? attendance.checkinTime,
			});
		}

		return json({
			success: true,
			attendance: {
				id: attendance.id,
				eventId: attendance.eventId,
				apprenticeId: attendance.apprenticeId,
				checkinTime: attendance.checkinTime,
				status: attendance.status,
			},
		});
	}
	catch (error) {
		console.error('Failed to create attendance:', error);
		const message = error instanceof Error ? error.message : 'Failed to create attendance';
		return json({ success: false, error: message }, { status: 500 });
	}
};
