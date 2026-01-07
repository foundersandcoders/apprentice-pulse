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
