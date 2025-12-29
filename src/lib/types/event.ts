export type EventType = 'Regular class' | 'Workshop' | 'Hackathon';

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
