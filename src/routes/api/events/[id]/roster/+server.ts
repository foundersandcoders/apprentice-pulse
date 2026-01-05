import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AttendanceStatus } from '$lib/types/attendance';
import { getEvent, getApprenticesByCohortId, getAttendanceByIds, getApprenticesByIds } from '$lib/airtable/sveltekit-wrapper';

export interface RosterEntry {
	id: string; // Apprentice ID or external attendance ID
	attendanceId?: string; // Attendance record ID (undefined if not checked in yet)
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

		// Fetch attendance and cohort apprentices in parallel
		const [attendance, ...cohortApprenticeArrays] = await Promise.all([
			getAttendanceByIds(event.attendanceIds ?? []),
			...event.cohortIds.map(id => getApprenticesByCohortId(id)),
		]);

		// Deduplicate apprentices (in case someone is in multiple cohorts)
		const cohortApprentices = [...new Map(cohortApprenticeArrays.flat().map(a => [a.id, a])).values()];

		// Build a map of apprentice IDs to their attendance info (including attendance record ID)
		const attendanceByApprentice = new Map<string, { attendanceId: string; status: AttendanceStatus; checkinTime: string }>();
		for (const record of attendance) {
			if (record.apprenticeId) {
				attendanceByApprentice.set(record.apprenticeId, {
					attendanceId: record.id,
					status: record.status,
					checkinTime: record.checkinTime,
				});
			}
		}

		const roster: RosterEntry[] = [];
		const addedApprenticeIds = new Set<string>();

		// Add apprentices from the cohort
		for (const apprentice of cohortApprentices) {
			const attendanceInfo = attendanceByApprentice.get(apprentice.id);
			roster.push({
				id: apprentice.id,
				attendanceId: attendanceInfo?.attendanceId,
				name: apprentice.name,
				email: apprentice.email,
				type: 'apprentice',
				status: attendanceInfo?.status ?? 'Absent',
				checkinTime: attendanceInfo?.checkinTime,
			});
			addedApprenticeIds.add(apprentice.id);
		}

		// Collect apprentice IDs that checked in but aren't in the cohort
		const nonCohortApprenticeIds = attendance
			.filter(r => r.apprenticeId && !addedApprenticeIds.has(r.apprenticeId))
			.map(r => r.apprenticeId!);

		// Fetch details for non-cohort apprentices
		const nonCohortApprentices = await getApprenticesByIds(nonCohortApprenticeIds);
		const apprenticeDetailsMap = new Map(nonCohortApprentices.map(a => [a.id, a]));

		// Add any checked-in apprentices not in the cohort (manually added or from other cohorts)
		// and external attendees (attendance records without an apprentice link)
		for (const record of attendance) {
			if (record.apprenticeId) {
				// Skip if already added from cohort
				if (!addedApprenticeIds.has(record.apprenticeId)) {
					const apprentice = apprenticeDetailsMap.get(record.apprenticeId);
					roster.push({
						id: record.apprenticeId,
						attendanceId: record.id,
						name: apprentice?.name || 'Unknown Apprentice',
						email: apprentice?.email || '',
						type: 'apprentice',
						status: record.status,
						checkinTime: record.checkinTime,
					});
				}
			}
			else {
				// External attendee - use attendance ID as the main ID
				roster.push({
					id: record.id,
					attendanceId: record.id,
					name: record.externalName || 'Unknown',
					email: record.externalEmail || '',
					type: 'external',
					status: record.status,
					checkinTime: record.checkinTime,
				});
			}
		}

		// Sort: Present first, then Late, Excused, Not Coming, Absent last; then alphabetically
		const statusOrder: Record<AttendanceStatus, number> = { 'Present': 0, 'Late': 1, 'Excused': 2, 'Not Coming': 3, 'Absent': 4 };
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
