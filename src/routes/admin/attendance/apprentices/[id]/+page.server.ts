import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	getApprenticeStats,
	getApprenticeAttendanceHistory,
	listTerms,
} from '$lib/airtable/sveltekit-wrapper';
import { parseFiltersFromParams } from '$lib/types/filters';

export const load: PageServerLoad = async ({ params, url }) => {
	const { id } = params;

	// Parse filters from URL params
	const filters = parseFiltersFromParams(url.searchParams);

	// Determine date range for filtering
	let dateOptions: { startDate: Date; endDate: Date } | undefined;

	if (filters.dateRange) {
		dateOptions = {
			startDate: filters.dateRange.startDate,
			endDate: filters.dateRange.endDate,
		};
	}
	else if (filters.termIds && filters.termIds.length > 0) {
		// Convert term IDs to date range
		const terms = await listTerms();
		const selectedTerms = terms.filter(t => filters.termIds!.includes(t.id));
		if (selectedTerms.length > 0) {
			const startDates = selectedTerms.map(t => new Date(t.startingDate));
			const endDates = selectedTerms.map(t => new Date(t.endDate));
			dateOptions = {
				startDate: new Date(Math.min(...startDates.map(d => d.getTime()))),
				endDate: new Date(Math.max(...endDates.map(d => d.getTime()))),
			};
		}
	}

	// Fetch apprentice stats with date filter
	const stats = await getApprenticeStats(id, dateOptions);

	if (!stats) {
		throw error(404, 'Apprentice not found');
	}

	// Fetch attendance history with same date filter
	const history = await getApprenticeAttendanceHistory(id, dateOptions);

	// Fetch terms for the filter component
	const terms = await listTerms();

	return {
		stats,
		history,
		terms,
	};
};
