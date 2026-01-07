// Attendance status options
export const ATTENDANCE_STATUSES = ['Present', 'Not Check-in', 'Late', 'Excused', 'Absent'] as const;
export type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];

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
