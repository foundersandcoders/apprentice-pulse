<script lang="ts">
	import type { Term } from '$lib/airtable/sveltekit-wrapper';
	import type { AttendanceFilters } from '$lib/types/filters';
	import AttendanceFiltersComponent from './AttendanceFilters.svelte';

	interface Props {
		terms: Term[];
		filters: AttendanceFilters;
		onFiltersChange: (filters: AttendanceFilters) => void;
	}

	let { terms, filters, onFiltersChange }: Props = $props();

	// Time period filter expanded state
	let timePeriodExpanded = $state(false);

	// Format date for display
	function formatDateDisplay(date: Date): string {
		return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
	}

	// Get display text for current time period filter
	const timePeriodDisplay = $derived.by(() => {
		if (filters.dateRange) {
			return `${formatDateDisplay(filters.dateRange.startDate)} - ${formatDateDisplay(filters.dateRange.endDate)}`;
		}
		if (filters.termIds && filters.termIds.length > 0) {
			return terms
				.filter(t => filters.termIds!.includes(t.id))
				.map(t => t.name)
				.join(', ');
		}
		return 'All Time';
	});
</script>

<!-- Time Period Filter -->
<div class="pt-4">
	<div class="flex flex-wrap items-center gap-2">
		<span class="text-sm font-medium text-gray-700">Time Period:</span>
		<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm">{timePeriodDisplay}</span>
		<button
			class="text-blue-600 hover:underline text-sm transition-colors ml-2"
			onclick={() => timePeriodExpanded = !timePeriodExpanded}
		>
			{timePeriodExpanded ? 'Hide options' : 'Change'}
		</button>
	</div>
	{#if timePeriodExpanded}
		<div class="mt-4 pt-4 border-t border-gray-100">
			<AttendanceFiltersComponent
				{terms}
				{filters}
				{onFiltersChange}
			/>
		</div>
	{/if}
</div>
