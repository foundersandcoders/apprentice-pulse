import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	getApprenticeAttendanceStats,
	getApprenticeAttendanceHistory,
} from '$lib/airtable/sveltekit-wrapper';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	// Fetch apprentice stats
	const stats = await getApprenticeAttendanceStats(id);

	if (!stats) {
		throw error(404, 'Apprentice not found');
	}

	// Fetch attendance history
	const history = await getApprenticeAttendanceHistory(id);

	return {
		stats,
		history,
	};
};
