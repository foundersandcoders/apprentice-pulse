// Single source of truth for event types
// Must match Airtable single-select options exactly (case-sensitive)
export const EVENT_TYPES = ['Regular Class', 'Workshop', 'Hackathon'] as const;
export type EventType = typeof EVENT_TYPES[number];

export interface Event {
	id: string;
	name: string;
	dateTime: string;
	cohortId: string;
	cohortName?: string;
	eventType: EventType;
	surveyUrl?: string;
	isPublic: boolean;
	checkInCode?: number;
	attendanceCount?: number;
}

export interface CreateEventInput {
	name: string;
	dateTime: string;
	cohortId?: string;
	eventType: EventType;
	surveyUrl?: string;
	isPublic?: boolean;
	checkInCode?: number;
}

export interface UpdateEventInput {
	name?: string;
	dateTime?: string;
	cohortId?: string;
	eventType?: EventType;
	surveyUrl?: string;
	isPublic?: boolean;
	checkInCode?: number;
}

export interface EventFilters {
	cohortId?: string;
	startDate?: string;
	endDate?: string;
}
