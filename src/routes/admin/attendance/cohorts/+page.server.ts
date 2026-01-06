import type { PageServerLoad } from './$types';
import { listCohorts, getCohortAttendanceStats } from '$lib/airtable/sveltekit-wrapper';
import type { CohortAttendanceStats } from '$lib/types/attendance';

export const load: PageServerLoad = async ({ url }) => {
	// Date range filtering support
	const startDate = url.searchParams.get('start');
	const endDate = url.searchParams.get('end');

	// Validate date format if provided
	let parsedStartDate: Date | null = null;
	let parsedEndDate: Date | null = null;

	if (startDate) {
		parsedStartDate = new Date(startDate);
		if (isNaN(parsedStartDate.getTime())) {
			parsedStartDate = null;
		}
	}

	if (endDate) {
		parsedEndDate = new Date(endDate);
		if (isNaN(parsedEndDate.getTime())) {
			parsedEndDate = null;
		}
	}

	try {
		// Fetch all cohorts first
		const cohorts = await listCohorts();

		// Fetch attendance statistics for each cohort
		const cohortStats: CohortAttendanceStats[] = [];
		for (const cohort of cohorts) {
			try {
				// Note: getCohortAttendanceStats currently doesn't support date filtering
				// This will be enhanced in a future update to use parsedStartDate/parsedEndDate
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
			dateRange: {
				start: startDate,
				end: endDate,
				parsedStart: parsedStartDate,
				parsedEnd: parsedEndDate,
			},
		};
	} catch (err) {
		console.error('[attendance/cohorts] Error loading data:', err);
		return {
			cohortStats: [],
			dateRange: {
				start: startDate,
				end: endDate,
				parsedStart: null,
				parsedEnd: null,
			},
		};
	}
};