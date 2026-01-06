import type { PageServerLoad } from './$types';
import { listCohorts, getCohortAttendanceStats } from '$lib/airtable/sveltekit-wrapper';
import type { CohortAttendanceStats } from '$lib/types/attendance';

export const load: PageServerLoad = async ({ url }) => {
	// Optional date range filtering (for future implementation)
	const startDate = url.searchParams.get('start');
	const endDate = url.searchParams.get('end');

	try {
		// Fetch all cohorts first
		const cohorts = await listCohorts();

		// Fetch attendance statistics for each cohort
		const cohortStats: CohortAttendanceStats[] = [];
		for (const cohort of cohorts) {
			try {
				const stats = await getCohortAttendanceStats(cohort.id);
				if (stats) {
					cohortStats.push(stats);
				}
			} catch (err) {
				console.error(`[attendance/cohorts] Error fetching stats for cohort ${cohort.id}:`, err);
				// Continue with other cohorts even if one fails
			}
		}

		return {
			cohortStats,
			startDate,
			endDate,
		};
	} catch (err) {
		console.error('[attendance/cohorts] Error loading data:', err);
		return {
			cohortStats: [],
			startDate,
			endDate,
		};
	}
};