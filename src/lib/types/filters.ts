/**
 * Shared filter types for attendance views
 */

/** Date range filter */
export interface DateRange {
	startDate: Date;
	endDate: Date;
}

/** Attendance filter options - terms and date range are mutually exclusive */
export interface AttendanceFilters {
	termIds?: string[];
	dateRange?: DateRange;
}

/** URL-serializable version of filters (dates as ISO strings) */
export interface AttendanceFiltersParams {
	terms?: string; // comma-separated term IDs
	startDate?: string; // ISO date string
	endDate?: string; // ISO date string
}

/** Parse URL params into AttendanceFilters */
export function parseFiltersFromParams(params: URLSearchParams): AttendanceFilters {
	const termsParam = params.get('terms');
	const startDateParam = params.get('startDate');
	const endDateParam = params.get('endDate');

	// Date range takes priority (mutually exclusive)
	if (startDateParam && endDateParam) {
		return {
			dateRange: {
				startDate: new Date(startDateParam),
				endDate: new Date(endDateParam),
			},
		};
	}

	if (termsParam) {
		return {
			termIds: termsParam.split(',').filter(Boolean),
		};
	}

	return {};
}

/** Serialize AttendanceFilters to URL params */
export function filtersToParams(filters: AttendanceFilters): URLSearchParams {
	const params = new URLSearchParams();

	if (filters.dateRange) {
		params.set('startDate', filters.dateRange.startDate.toISOString().split('T')[0]);
		params.set('endDate', filters.dateRange.endDate.toISOString().split('T')[0]);
	}
	else if (filters.termIds && filters.termIds.length > 0) {
		params.set('terms', filters.termIds.join(','));
	}

	return params;
}
