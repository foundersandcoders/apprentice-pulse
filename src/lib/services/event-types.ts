import { createEventTypesClient } from '$lib/airtable/event-types';
import { AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS } from '$env/static/private';

export interface EventTypeOption {
	id: string;
	name: string;
	color: string;
	tailwindClass: string;
	defaultSurveyUrl?: string;
}

// Default colors for known event types (fallback system)
const DEFAULT_COLORS: Record<string, { main: string; tailwind: string }> = {
	'Regular Class': { main: '#3b82f6', tailwind: 'text-blue-600' },
	'Workshop': { main: '#10b981', tailwind: 'text-emerald-600' },
	'Online Class': { main: '#f59e0b', tailwind: 'text-amber-600' },
};

// Color palette for unknown event types
const FALLBACK_COLORS = [
	{ main: '#8b5cf6', tailwind: 'text-violet-600' },
	{ main: '#ef4444', tailwind: 'text-red-600' },
	{ main: '#06b6d4', tailwind: 'text-cyan-600' },
	{ main: '#84cc16', tailwind: 'text-lime-600' },
	{ main: '#f97316', tailwind: 'text-orange-600' },
	{ main: '#ec4899', tailwind: 'text-pink-600' },
	{ main: '#6b7280', tailwind: 'text-gray-600' },
];

class EventTypesService {
	private client = createEventTypesClient(AIRTABLE_API_KEY, AIRTABLE_BASE_ID_LEARNERS);
	private cache: EventTypeOption[] | null = null;
	private cacheTimestamp: number = 0;
	private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

	/**
	 * Get all available event types with colors
	 */
	async getEventTypes(): Promise<EventTypeOption[]> {
		// Check cache
		const now = Date.now();
		if (this.cache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
			return this.cache;
		}

		try {
			const types = await this.client.listEventTypes();

			const options: EventTypeOption[] = types.map((type, index) => {
				// Use default color if available, otherwise use fallback color
				const colorConfig = DEFAULT_COLORS[type.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];

				return {
					id: type.id,
					name: type.name,
					color: colorConfig.main,
					tailwindClass: colorConfig.tailwind,
					defaultSurveyUrl: type.defaultSurveyUrl,
				};
			});

			// Update cache
			this.cache = options;
			this.cacheTimestamp = now;

			return options;
		}
		catch (error) {
			console.error('Failed to fetch event types:', error);

			// Return hardcoded fallback if Airtable is unavailable
			return [
				{
					id: 'fallback-regular',
					name: 'Regular Class',
					color: DEFAULT_COLORS['Regular Class'].main,
					tailwindClass: DEFAULT_COLORS['Regular Class'].tailwind,
				},
				{
					id: 'fallback-workshop',
					name: 'Workshop',
					color: DEFAULT_COLORS['Workshop'].main,
					tailwindClass: DEFAULT_COLORS['Workshop'].tailwind,
				},
				{
					id: 'fallback-online',
					name: 'Online Class',
					color: DEFAULT_COLORS['Online Class'].main,
					tailwindClass: DEFAULT_COLORS['Online Class'].tailwind,
				},
			];
		}
	}

	/**
	 * Get event type names only (for validation)
	 */
	async getEventTypeNames(): Promise<string[]> {
		const types = await this.getEventTypes();
		return types.map(t => t.name);
	}

	/**
	 * Get color for a specific event type name
	 */
	async getColorForEventType(eventTypeName: string): Promise<{ main: string; tailwind: string }> {
		const types = await this.getEventTypes();
		const type = types.find(t => t.name === eventTypeName);

		if (type) {
			return {
				main: type.color,
				tailwind: type.tailwindClass,
			};
		}

		// Fallback for unknown types
		return DEFAULT_COLORS[eventTypeName] || FALLBACK_COLORS[0];
	}

	/**
	 * Clear cache (useful for testing or forcing refresh)
	 */
	clearCache(): void {
		this.cache = null;
		this.cacheTimestamp = 0;
	}

	/**
	 * Validate if an event type name exists
	 */
	async isValidEventType(eventTypeName: string): Promise<boolean> {
		const names = await this.getEventTypeNames();
		return names.includes(eventTypeName);
	}

	/**
	 * Get default survey URL for a specific event type
	 */
	async getDefaultSurveyForEventType(eventTypeName: string): Promise<string | null> {
		const types = await this.getEventTypes();
		const type = types.find(t => t.name === eventTypeName);
		return type?.defaultSurveyUrl || null;
	}
}

// Singleton instance
export const eventTypesService = new EventTypesService();
