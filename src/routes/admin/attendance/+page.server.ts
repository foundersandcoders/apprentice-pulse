import type { PageServerLoad } from './$types';
import {
	listCohorts,
	listTerms,
	getApprenticesByCohortId,
	getApprenticeStats,
	getApprenticeAttendanceHistory,
} from '$lib/airtable/sveltekit-wrapper';
import type { ApprenticeAttendanceStats, AttendanceHistoryEntry } from '$lib/types/attendance';

export const load: PageServerLoad = async ({ url }) => {
	// Support multiple cohorts via comma-separated IDs
	const cohortParam = url.searchParams.get('cohorts');
	const selectedCohortIds = cohortParam ? cohortParam.split(',').filter(Boolean) : [];
	const showAll = url.searchParams.get('all') === 'true';
	const termsParam = url.searchParams.get('terms');
	const selectedTermIds = termsParam ? termsParam.split(',').filter(Boolean) : [];
	const startDateParam = url.searchParams.get('startDate');
	const endDateParam = url.searchParams.get('endDate');

	try {
		// Always fetch cohorts and terms for the selection UI
		const [cohorts, terms] = await Promise.all([
			listCohorts(),
			listTerms(),
		]);

		// If no cohort selected and not showing all, return early with just cohorts and terms
		if (selectedCohortIds.length === 0 && !showAll) {
			return {
				apprentices: [],
				combinedHistory: [],
				cohorts,
				terms,
				selectedCohortIds,
				selectedTermIds,
				selectedStartDate: startDateParam || '',
				selectedEndDate: endDateParam || '',
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

		// Determine date range for filtering
		let filterStartDate: Date | null = null;
		let filterEndDate: Date | null = null;

		if (startDateParam && endDateParam) {
			// Custom date range takes priority
			filterStartDate = new Date(startDateParam);
			filterEndDate = new Date(endDateParam);
		}
		else if (selectedTermIds.length > 0) {
			// Fall back to term-based filtering
			const selectedTerms = terms.filter(t => selectedTermIds.includes(t.id));
			if (selectedTerms.length > 0) {
				// Find earliest start date and latest end date across all selected terms
				const startDates = selectedTerms.map(t => new Date(t.startingDate));
				const endDates = selectedTerms.map(t => new Date(t.endDate));

				filterStartDate = new Date(Math.min(...startDates.map(d => d.getTime())));
				filterEndDate = new Date(Math.max(...endDates.map(d => d.getTime())));
			}
		}

		// Fetch attendance stats and history for each apprentice
		const apprenticeStats: ApprenticeAttendanceStats[] = [];
		const allHistory: AttendanceHistoryEntry[] = [];
		const dateOptions = filterStartDate && filterEndDate
			? { startDate: filterStartDate, endDate: filterEndDate }
			: undefined;

		for (const apprenticeId of apprenticeIds) {
			try {
				const [stats, history] = await Promise.all([
					getApprenticeStats(apprenticeId, dateOptions),
					getApprenticeAttendanceHistory(apprenticeId, dateOptions),
				]);
				if (stats) {
					apprenticeStats.push(stats);
				}
				allHistory.push(...history);
			}
			catch (err) {
				console.error(`[attendance] Error fetching data for ${apprenticeId}:`, err);
			}
		}

		return {
			apprentices: apprenticeStats,
			combinedHistory: allHistory,
			cohorts,
			terms,
			selectedCohortIds,
			selectedTermIds,
			selectedStartDate: startDateParam || '',
			selectedEndDate: endDateParam || '',
			showAll,
			needsSelection: false,
		};
	}
	catch (err) {
		console.error('[attendance] Error loading data:', err);
		return {
			apprentices: [],
			combinedHistory: [],
			cohorts: [],
			terms: [],
			selectedCohortIds,
			selectedTermIds,
			selectedStartDate: startDateParam || '',
			selectedEndDate: endDateParam || '',
			showAll: false,
			needsSelection: true,
		};
	}
};
