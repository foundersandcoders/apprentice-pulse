// Attendance status options
export const ATTENDANCE_STATUSES = ['Present', 'Not Check-in', 'Late', 'Excused', 'Absent'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];

// Centralized status styling - single source of truth for colors
export const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; badge: string }> = {
	'Present': { bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-100 text-green-700' },
	'Late': { bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' },
	'Excused': { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
	'Not Check-in': { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
	'Absent': { bg: 'bg-orange-50', text: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' },
};

// Helper to get badge classes for a status
export function getStatusBadgeClass(status: AttendanceStatus): string {
	return STATUS_STYLES[status]?.badge ?? 'bg-gray-100 text-gray-700';
}

export interface Attendance {
	id: string;
	eventId: string;
	apprenticeId?: string; // For registered users
	apprenticeName?: string; // Lookup from linked apprentice
	apprenticeEmail?: string; // Lookup from linked apprentice
	externalName?: string; // For unregistered users
	externalEmail?: string; // For unregistered users
	checkinTime: string; // ISO datetime
	status: AttendanceStatus;
}

export interface CreateAttendanceInput {
	eventId: string;
	apprenticeId: string;
}

export interface CreateExternalAttendanceInput {
	eventId: string;
	name: string;
	email: string;
}

export interface UpdateAttendanceInput {
	status: AttendanceStatus;
	checkinTime?: string; // ISO datetime, required when setting to Present
}

// Attendance statistics types

/** Trend direction for attendance metrics */
export type TrendDirection = 'up' | 'down' | 'stable';

/** Base attendance statistics */
export interface AttendanceStats {
	totalEvents: number;
	attended: number; // Present + Late
	present: number;
	late: number;
	absent: number;
	excused: number;
	notComing: number;
	attendanceRate: number; // 0-100 percentage
}

/** Trend data comparing recent period to previous */
export interface AttendanceTrend {
	direction: TrendDirection;
	change: number; // Percentage point change (e.g., +5 or -3)
	currentRate: number;
	previousRate: number;
}

/** Individual apprentice attendance statistics */
export interface ApprenticeAttendanceStats extends AttendanceStats {
	apprenticeId: string;
	apprenticeName: string;
	cohortId: string | null;
	cohortName: string | null;
	trend: AttendanceTrend;
}

/** Cohort-level attendance statistics */
export interface CohortAttendanceStats extends AttendanceStats {
	cohortId: string;
	cohortName: string;
	apprenticeCount: number;
	trend: AttendanceTrend;
}

/** Aggregated cohort overview stats for the summary card */
export interface CohortOverviewStats extends AttendanceStats {
	apprenticeCount: number;
	apprenticesAtRisk: number; // Count of apprentices below 80% attendance
}

const LOW_ATTENDANCE_THRESHOLD = 80;

/**
 * Calculate aggregated cohort overview stats from an array of apprentice stats
 */
export function calculateCohortOverview(apprentices: ApprenticeAttendanceStats[]): CohortOverviewStats {
	if (apprentices.length === 0) {
		return {
			totalEvents: 0,
			attended: 0,
			present: 0,
			late: 0,
			absent: 0,
			excused: 0,
			notComing: 0,
			attendanceRate: 0,
			apprenticeCount: 0,
			apprenticesAtRisk: 0,
		};
	}

	// Aggregate all stats
	const totals = apprentices.reduce(
		(acc, a) => ({
			totalEvents: acc.totalEvents + a.totalEvents,
			attended: acc.attended + a.attended,
			present: acc.present + a.present,
			late: acc.late + a.late,
			absent: acc.absent + a.absent,
			excused: acc.excused + a.excused,
			notComing: acc.notComing + a.notComing,
		}),
		{ totalEvents: 0, attended: 0, present: 0, late: 0, absent: 0, excused: 0, notComing: 0 },
	);

	// Count apprentices at risk (below threshold)
	const apprenticesAtRisk = apprentices.filter(a => a.attendanceRate < LOW_ATTENDANCE_THRESHOLD).length;

	// Calculate overall attendance rate
	const attendanceRate = totals.totalEvents > 0
		? (totals.attended / totals.totalEvents) * 100
		: 0;

	return {
		...totals,
		attendanceRate,
		apprenticeCount: apprentices.length,
		apprenticesAtRisk,
	};
}

/** Overall attendance summary for dashboard */
export interface AttendanceSummary {
	overall: AttendanceStats;
	trend: AttendanceTrend;
	totalApprentices: number;
	lowAttendanceCount: number; // Apprentices below 80%
	recentCheckIns: number; // Check-ins in last 7 days
}

/** Attendance history entry for a single event */
export interface AttendanceHistoryEntry {
	eventId: string;
	eventName: string;
	eventDateTime: string;
	status: AttendanceStatus;
	checkinTime: string | null;
	attendanceId: string | null; // Null when no attendance record exists (defaults to 'Not Check-in')
}

/** Event breakdown stats for cohort view */
export interface EventBreakdownEntry {
	eventId: string;
	eventName: string;
	eventDateTime: string;
	present: number;
	late: number;
	excused: number;
	notCheckin: number;
	absent: number;
	total: number;
}

/**
 * Calculate event breakdown from attendance history
 * Groups by event and counts each status type
 */
export function calculateEventBreakdown(history: AttendanceHistoryEntry[]): EventBreakdownEntry[] {
	if (history.length === 0) return [];

	const eventMap = new Map<string, EventBreakdownEntry>();

	for (const entry of history) {
		if (!eventMap.has(entry.eventId)) {
			eventMap.set(entry.eventId, {
				eventId: entry.eventId,
				eventName: entry.eventName,
				eventDateTime: entry.eventDateTime,
				present: 0,
				late: 0,
				excused: 0,
				notCheckin: 0,
				absent: 0,
				total: 0,
			});
		}

		const event = eventMap.get(entry.eventId)!;
		event.total++;

		switch (entry.status) {
			case 'Present':
				event.present++;
				break;
			case 'Late':
				event.late++;
				break;
			case 'Excused':
				event.excused++;
				break;
			case 'Not Check-in':
				event.notCheckin++;
				break;
			case 'Absent':
				event.absent++;
				break;
		}
	}

	// Sort by date (newest first)
	return Array.from(eventMap.values())
		.sort((a, b) => new Date(b.eventDateTime).getTime() - new Date(a.eventDateTime).getTime());
}

/** Monthly attendance data point for charts */
export interface MonthlyAttendancePoint {
	month: string; // Display format: "Jan 2025"
	sortKey: string; // Sort format: "2025-01"
	percentage: number; // Attendance rate: (Present + Late) / Total
	latenessPercentage: number; // Lateness rate: Late / Total
	attended: number;
	late: number;
	total: number;
}

/**
 * Calculate monthly attendance percentages from history entries
 * Groups events by month and calculates attendance and lateness rates
 */
export function calculateMonthlyAttendance(history: AttendanceHistoryEntry[]): MonthlyAttendancePoint[] {
	if (history.length === 0) return [];

	// Group events by month
	const monthlyData = new Map<string, { attended: number; late: number; total: number }>();

	for (const entry of history) {
		const date = new Date(entry.eventDateTime);
		const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

		if (!monthlyData.has(sortKey)) {
			monthlyData.set(sortKey, { attended: 0, late: 0, total: 0 });
		}

		const data = monthlyData.get(sortKey)!;
		data.total++;

		// Present and Late count as attended
		if (entry.status === 'Present' || entry.status === 'Late') {
			data.attended++;
		}

		// Track late separately
		if (entry.status === 'Late') {
			data.late++;
		}
	}

	// Convert to array and sort by date
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	return Array.from(monthlyData.entries())
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([sortKey, data]) => {
			const [year, monthNum] = sortKey.split('-');
			const monthName = months[parseInt(monthNum, 10) - 1];
			return {
				month: `${monthName} ${year}`,
				sortKey,
				percentage: data.total > 0 ? (data.attended / data.total) * 100 : 0,
				latenessPercentage: data.total > 0 ? (data.late / data.total) * 100 : 0,
				attended: data.attended,
				late: data.late,
				total: data.total,
			};
		});
}
