import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AttendanceStatus } from '$lib/types/attendance';
import { getEvent, getApprenticesByCohortId, getAttendanceForEvent } from '$lib/airtable/sveltekit-wrapper';

export interface RosterEntry {
	id: string;
	name: string;
	email: string;
	type: 'apprentice' | 'external';
	status: AttendanceStatus;
	checkinTime?: string;
}

export const GET: RequestHandler = async ({ params }) => {
	try {
		const event = await getEvent(params.id);

		if (!event) {
			return json({ success: false, error: 'Event not found' }, { status: 404 });
		}

		// Get attendance records for this event
		const attendance = await getAttendanceForEvent(params.id);

		// Build a map of apprentice IDs to their attendance info
		const attendanceByApprentice = new Map<string, { status: AttendanceStatus; checkinTime: string }>();
		for (const record of attendance) {
			if (record.apprenticeId) {
				attendanceByApprentice.set(record.apprenticeId, {
					status: record.status,
					checkinTime: record.checkinTime,
				});
			}
		}

		const roster: RosterEntry[] = [];

		// If event has a cohort, get all apprentices
		if (event.cohortId) {
			const apprentices = await getApprenticesByCohortId(event.cohortId);

			for (const apprentice of apprentices) {
				const attendanceInfo = attendanceByApprentice.get(apprentice.id);
				roster.push({
					id: apprentice.id,
					name: apprentice.name,
					email: apprentice.email,
					type: 'apprentice',
					status: attendanceInfo?.status ?? 'Absent',
					checkinTime: attendanceInfo?.checkinTime,
				});
			}
		}

		// Add external attendees
		for (const record of attendance) {
			if (record.externalName && record.externalEmail) {
				roster.push({
					id: record.id,
					name: record.externalName,
					email: record.externalEmail,
					type: 'external',
					status: record.status,
					checkinTime: record.checkinTime,
				});
			}
		}

		// Sort: Present first, then Late, Excused, Absent last; then alphabetically
		const statusOrder: Record<AttendanceStatus, number> = { Present: 0, Late: 1, Excused: 2, Absent: 3 };
		roster.sort((a, b) => {
			const statusDiff = statusOrder[a.status] - statusOrder[b.status];
			if (statusDiff !== 0) return statusDiff;
			return a.name.localeCompare(b.name);
		});

		return json({
			success: true,
			roster,
			summary: {
				total: roster.length,
				present: roster.filter(r => r.status === 'Present').length,
				late: roster.filter(r => r.status === 'Late').length,
				excused: roster.filter(r => r.status === 'Excused').length,
				absent: roster.filter(r => r.status === 'Absent').length,
			},
		});
	}
	catch (error) {
		console.error('Failed to get event roster:', error);
		return json({ success: false, error: 'Failed to get event roster' }, { status: 500 });
	}
};
