// Type declarations for @event-calendar/core
declare module '@event-calendar/core' {
	import type { SvelteComponent, ComponentType } from 'svelte';

	interface CalendarOptions {
		view?: string;
		headerToolbar?: {
			start?: string;
			center?: string;
			end?: string;
		};
		buttonText?: Record<string, string>;
		events?: Array<{
			id: string;
			title?: string;
			start: string;
			end?: string;
			color?: string;
			display?: 'background' | 'auto';
		}>;
		eventClick?: (info: { event: { id: string } }) => void;
		dateClick?: (info: { date: Date }) => void;
		dayMaxEvents?: boolean;
		nowIndicator?: boolean;
		selectable?: boolean;
	}

	interface CalendarProps {
		plugins: ComponentType[];
		options: CalendarOptions;
	}

	export class Calendar extends SvelteComponent<CalendarProps> {}
	export const DayGrid: ComponentType;
	export const Interaction: ComponentType;
	export const TimeGrid: ComponentType;
	export const List: ComponentType;
	export const ResourceTimeline: ComponentType;
	export const ResourceTimeGrid: ComponentType;
}
