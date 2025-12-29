import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getEvent, getApprenticesByCohortId, getAttendanceForEvent } from '$lib/airtable/sveltekit-wrapper';

export interface RosterEntry {
	id: string;
	name: string;
	email: string;
	type: 'apprentice' | 'external';
	checkedIn: boolean;
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

		// Build a set of apprentice IDs who checked in
		const checkedInApprentices = new Map<string, string>();
		for (const record of attendance) {
			if (record.apprenticeId) {
				checkedInApprentices.set(record.apprenticeId, record.checkinTime);
			}
		}

		const roster: RosterEntry[] = [];

		// If event has a cohort, get all apprentices
		if (event.cohortId) {
			const apprentices = await getApprenticesByCohortId(event.cohortId);

			for (const apprentice of apprentices) {
				const checkinTime = checkedInApprentices.get(apprentice.id);
				roster.push({
					id: apprentice.id,
					name: apprentice.name,
					email: apprentice.email,
					type: 'apprentice',
					checkedIn: !!checkinTime,
					checkinTime,
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
					checkedIn: true,
					checkinTime: record.checkinTime,
				});
			}
		}

		// Sort: checked in first, then alphabetically by name
		roster.sort((a, b) => {
			if (a.checkedIn !== b.checkedIn) {
				return a.checkedIn ? -1 : 1;
			}
			return a.name.localeCompare(b.name);
		});

		return json({
			success: true,
			roster,
			summary: {
				total: roster.length,
				checkedIn: roster.filter(r => r.checkedIn).length,
				apprentices: roster.filter(r => r.type === 'apprentice').length,
				external: roster.filter(r => r.type === 'external').length,
			},
		});
	}
	catch (error) {
		console.error('Failed to get event roster:', error);
		return json({ success: false, error: 'Failed to get event roster' }, { status: 500 });
	}
};
