// Attendance status options
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused'] as const;
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
