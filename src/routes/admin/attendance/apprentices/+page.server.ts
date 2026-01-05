import type { PageServerLoad } from './$types';
import {
	listCohorts,
	getApprenticesByCohortId,
	getApprenticeAttendanceStats,
} from '$lib/airtable/sveltekit-wrapper';
import type { ApprenticeAttendanceStats } from '$lib/types/attendance';

export const load: PageServerLoad = async ({ url }) => {
	// Support multiple cohorts via comma-separated IDs
	const cohortParam = url.searchParams.get('cohorts');
	const selectedCohortIds = cohortParam ? cohortParam.split(',').filter(Boolean) : [];
	const showAll = url.searchParams.get('all') === 'true';

	try {
		// Always fetch cohorts for the selection UI
		const cohorts = await listCohorts();

		// If no cohort selected and not showing all, return early with just cohorts
		if (selectedCohortIds.length === 0 && !showAll) {
			return {
				apprentices: [],
				cohorts,
				selectedCohortIds,
				showAll: false,
				needsSelection: true,
			};
		}

		// Collect apprentice IDs based on selection
		let apprenticeIds: string[] = [];

		if (showAll) {
			// Get all apprentices from all cohorts
			for (const cohort of cohorts) {
				const apprentices = await getApprenticesByCohortId(cohort.id);
				apprenticeIds.push(...apprentices.map(a => a.id));
			}
		}
		else {
			// Get apprentices from selected cohorts only
			for (const cohortId of selectedCohortIds) {
				const apprentices = await getApprenticesByCohortId(cohortId);
				apprenticeIds.push(...apprentices.map(a => a.id));
			}
		}

		// Deduplicate in case an apprentice is in multiple cohorts
		apprenticeIds = [...new Set(apprenticeIds)];

		// Fetch attendance stats for each apprentice
		const apprenticeStats: ApprenticeAttendanceStats[] = [];
		for (const apprenticeId of apprenticeIds) {
			try {
				const stats = await getApprenticeAttendanceStats(apprenticeId);
				if (stats) {
					apprenticeStats.push(stats);
				}
			}
			catch (err) {
				console.error(`[attendance/apprentices] Error fetching stats for ${apprenticeId}:`, err);
			}
		}

		return {
			apprentices: apprenticeStats,
			cohorts,
			selectedCohortIds,
			showAll,
			needsSelection: false,
		};
	}
	catch (err) {
		console.error('[attendance/apprentices] Error loading data:', err);
		return {
			apprentices: [],
			cohorts: [],
			selectedCohortIds,
			showAll: false,
			needsSelection: true,
		};
	}
};
