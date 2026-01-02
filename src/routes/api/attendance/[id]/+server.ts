import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateAttendance } from '$lib/airtable/sveltekit-wrapper';
import { ATTENDANCE_STATUSES } from '$lib/types/attendance';

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();

		// Validate status
		if (!body.status || !ATTENDANCE_STATUSES.includes(body.status)) {
			return json(
				{ success: false, error: 'Invalid status. Must be one of: ' + ATTENDANCE_STATUSES.join(', ') },
				{ status: 400 },
			);
		}

		// Validate checkinTime format if provided
		if (body.checkinTime) {
			const date = new Date(body.checkinTime);
			if (isNaN(date.getTime())) {
				return json(
					{ success: false, error: 'Invalid checkinTime format' },
					{ status: 400 },
				);
			}
		}

		const attendance = await updateAttendance(id, {
			status: body.status,
			checkinTime: body.checkinTime,
		});

		return json({ success: true, attendance });
	}
	catch (error) {
		console.error('Failed to update attendance:', error);
		return json({ success: false, error: 'Failed to update attendance' }, { status: 500 });
	}
};
