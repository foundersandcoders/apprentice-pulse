// Event types are now dynamic from Airtable
// Use string instead of constrained union for flexibility
export type EventType = string;

// Color configuration for event types is now handled dynamically
// See src/lib/services/event-types.ts for color management

export interface EventTypeColor {
	main: string; // Primary color (hex)
	container: string; // Background color for calendar events
	onContainer: string; // Text color on container background
	tailwind: string; // Tailwind text class for list styling
}

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
