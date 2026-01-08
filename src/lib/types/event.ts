// Single source of truth for event types
// Must match Airtable single-select options exactly (case-sensitive)
export const EVENT_TYPES = ['Regular Class', 'Workshop', 'Online Class'] as const;
export type EventType = typeof EVENT_TYPES[number];

// Color configuration for each event type
// Used for calendar display and UI styling
export interface EventTypeColor {
	main: string; // Primary color (hex)
	container: string; // Background color for calendar events
	onContainer: string; // Text color on container background
	tailwind: string; // Tailwind text class for list styling
}

export const EVENT_TYPE_COLORS: Record<EventType, EventTypeColor> = {
	'Regular Class': {
		main: '#3b82f6',
		container: '#dbeafe',
		onContainer: '#1e40af',
		tailwind: 'text-blue-600',
	},
	'Workshop': {
		main: '#10b981',
		container: '#d1fae5',
		onContainer: '#065f46',
		tailwind: 'text-emerald-600',
	},
	'Online Class': {
		main: '#f59e0b',
		container: '#fef3c7',
		onContainer: '#92400e',
		tailwind: 'text-amber-600',
	},
};

export interface Event {
	id: string;
	name: string;
	dateTime: string;
	endDateTime?: string;
	cohortIds: string[];
	cohortNames?: string[];
	eventType: EventType;
	surveyUrl?: string;
	isPublic: boolean;
	checkInCode?: number;
	attendanceCount?: number;
	attendanceIds?: string[]; // Linked attendance record IDs (from getEvent)
}

export interface CreateEventInput {
	name: string;
	dateTime: string;
	endDateTime?: string;
	cohortIds?: string[];
	eventType: EventType;
	surveyUrl?: string;
	isPublic?: boolean;
	checkInCode?: number;
}

export interface UpdateEventInput {
	name?: string;
	dateTime?: string;
	endDateTime?: string;
	cohortIds?: string[];
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
