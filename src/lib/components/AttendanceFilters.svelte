<script lang="ts">
	import type { Term } from '$lib/airtable/sveltekit-wrapper';
	import type { AttendanceFilters } from '$lib/types/filters';

	interface Props {
		terms: Term[];
		filters: AttendanceFilters;
		onFiltersChange: (filters: AttendanceFilters) => void;
	}

	let { terms, filters, onFiltersChange }: Props = $props();

	// Filter mode state - determines which filter type is active
	type FilterMode = 'all' | 'terms' | 'dateRange';
	let filterMode = $state<FilterMode>('all');

	// Term filter state
	let stagedTermIds = $state<string[]>([]);
	let termDropdownOpen = $state(false);

	// Date range filter state (YYYY-MM-DD format for input elements)
	let stagedStartDate = $state<string>('');
	let stagedEndDate = $state<string>('');

	// Derive applied values from filters prop
	const appliedTermIds = $derived(filters.termIds ?? []);
	const appliedStartDate = $derived(
		filters.dateRange?.startDate
			? filters.dateRange.startDate.toISOString().split('T')[0]
			: '',
	);
	const appliedEndDate = $derived(
		filters.dateRange?.endDate
			? filters.dateRange.endDate.toISOString().split('T')[0]
			: '',
	);

	// Track if staged values differ from applied
	const hasTermChanges = $derived(() => {
		if (stagedTermIds.length !== appliedTermIds.length) return true;
		return !stagedTermIds.every(id => appliedTermIds.includes(id));
	});

	const hasDateChanges = $derived(() => {
		return stagedStartDate !== appliedStartDate || stagedEndDate !== appliedEndDate;
	});

	// Sync staged values when filters prop changes
	$effect(() => {
		stagedTermIds = [...appliedTermIds];
		stagedStartDate = appliedStartDate;
		stagedEndDate = appliedEndDate;

		// Determine filter mode based on what's set
		if (appliedStartDate && appliedEndDate) {
			filterMode = 'dateRange';
		}
		else if (appliedTermIds.length > 0) {
			filterMode = 'terms';
		}
		else {
			filterMode = 'all';
		}
	});

	// Close dropdown when clicking outside
	$effect(() => {
		if (!termDropdownOpen) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Element;
			if (!target.closest('[data-dropdown="terms"]')) {
				termDropdownOpen = false;
			}
		};

		const timeoutId = setTimeout(() => {
			document.addEventListener('click', handleClickOutside);
		}, 10);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener('click', handleClickOutside);
		};
	});

	// Toggle staged term selection
	function toggleStagedTermSelection(termId: string) {
		const index = stagedTermIds.indexOf(termId);
		if (index === -1) {
			stagedTermIds.push(termId);
		}
		else {
			stagedTermIds.splice(index, 1);
		}
	}

	// Apply staged term selection
	function applyTermSelection() {
		onFiltersChange({ termIds: [...stagedTermIds] });
		termDropdownOpen = false;
	}

	// Select all terms
	function selectAllTerms() {
		stagedTermIds = terms.map(t => t.id);
	}

	// Apply staged date selection
	function applyDateSelection() {
		if (stagedStartDate && stagedEndDate) {
			onFiltersChange({
				dateRange: {
					startDate: new Date(stagedStartDate),
					endDate: new Date(stagedEndDate),
				},
			});
		}
	}

	// Handle filter mode change
	function setFilterMode(mode: FilterMode) {
		filterMode = mode;
		if (mode === 'all') {
			// Clear all filters
			stagedTermIds = [];
			stagedStartDate = '';
			stagedEndDate = '';
			// If we had any filters, clear them
			if (appliedTermIds.length > 0 || appliedStartDate || appliedEndDate) {
				onFiltersChange({});
			}
		}
		else if (mode === 'terms') {
			// Clear date selection when switching to terms
			stagedStartDate = '';
			stagedEndDate = '';
			// If we had date filters, clear them
			if (appliedStartDate || appliedEndDate) {
				onFiltersChange({ termIds: stagedTermIds.length > 0 ? stagedTermIds : undefined });
			}
		}
		else {
			// Clear term selection when switching to date range
			stagedTermIds = [];
			// If we had term filters, clear them
			if (appliedTermIds.length > 0) {
				onFiltersChange({});
			}
		}
	}

	// Format date for display (DD/MM/YYYY)
	function formatDateShort(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	}
</script>

<div class="space-y-4">
	<!-- Filter Mode Selection -->
	<div class="flex flex-wrap items-center gap-x-6 gap-y-2">
		<span class="text-sm font-medium text-gray-700">Time Period:</span>
		<label class="flex items-center space-x-2 cursor-pointer">
			<input
				type="radio"
				name="filterMode"
				value="all"
				checked={filterMode === 'all'}
				onchange={() => setFilterMode('all')}
				class="text-blue-600 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">All</span>
		</label>
		<label class="flex items-center space-x-2 cursor-pointer">
			<input
				type="radio"
				name="filterMode"
				value="terms"
				checked={filterMode === 'terms'}
				onchange={() => setFilterMode('terms')}
				class="text-blue-600 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">Terms</span>
		</label>
		<label class="flex items-center space-x-2 cursor-pointer">
			<input
				type="radio"
				name="filterMode"
				value="dateRange"
				checked={filterMode === 'dateRange'}
				onchange={() => setFilterMode('dateRange')}
				class="text-blue-600 focus:ring-blue-500"
			/>
			<span class="text-sm text-gray-700">Custom Date Range</span>
		</label>
	</div>

	<!-- Term Filter -->
	{#if filterMode === 'terms' && terms.length > 0}
		<div>
			<div class="relative" data-dropdown="terms">
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation();
						termDropdownOpen = !termDropdownOpen;
					}}
					class="w-full text-left border rounded px-3 py-2 text-sm bg-white hover:border-blue-300 flex justify-between items-center"
				>
					<span class="truncate">
						{#if appliedTermIds.length === 0}
							<span class="text-gray-400">Filter by terms...</span>
						{:else}
							{@const selectedTermNames = terms
								.filter(t => appliedTermIds.includes(t.id))
								.map(t => t.name)
								.join(', ')}
							{selectedTermNames}
						{/if}
					</span>
					<span class="text-gray-400 ml-1">{termDropdownOpen ? '▲' : '▼'}</span>
				</button>
				{#if termDropdownOpen}
					<div
						class="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-72 overflow-y-auto"
						onmousedown={e => e.stopPropagation()}
						role="listbox"
						tabindex="-1"
					>
						<div class="border-b border-gray-200 px-2 py-1.5">
							<button
								onclick={selectAllTerms}
								class="text-xs text-blue-600 hover:text-blue-800 font-medium"
								disabled={stagedTermIds.length === terms.length}
							>
								Select All
							</button>
						</div>
						{#each terms as term (term.id)}
							{@const startDate = formatDateShort(term.startingDate)}
							{@const endDate = formatDateShort(term.endDate)}
							<label class="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
								<input
									type="checkbox"
									checked={stagedTermIds.includes(term.id)}
									onchange={() => toggleStagedTermSelection(term.id)}
									class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<span class="truncate">
									{term.name} ({startDate} - {endDate})
								</span>
							</label>
						{/each}
						<div class="border-t border-gray-200 px-2 py-2 flex justify-between items-center gap-2">
							<button
								onclick={() => { stagedTermIds = []; }}
								class="text-xs text-gray-500 hover:text-gray-700 font-medium"
								disabled={stagedTermIds.length === 0}
							>
								Clear all
							</button>
							<button
								onclick={applyTermSelection}
								class="px-3 py-1 rounded text-xs font-medium transition-colors {hasTermChanges() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
								disabled={!hasTermChanges()}
							>
								Apply
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Date Range Filter -->
	{#if filterMode === 'dateRange'}
		<div class="space-y-3">
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="startDate" class="block text-xs font-medium text-gray-700 mb-1">
						Start Date
					</label>
					<input
						id="startDate"
						type="date"
						bind:value={stagedStartDate}
						class="w-full border rounded px-3 py-2 text-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
					/>
				</div>
				<div>
					<label for="endDate" class="block text-xs font-medium text-gray-700 mb-1">
						End Date
					</label>
					<input
						id="endDate"
						type="date"
						bind:value={stagedEndDate}
						class="w-full border rounded px-3 py-2 text-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
					/>
				</div>
			</div>
			<div class="flex justify-end">
				<button
					onclick={applyDateSelection}
					class="px-4 py-2 rounded text-sm font-medium transition-colors {hasDateChanges() && stagedStartDate && stagedEndDate ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
					disabled={!hasDateChanges() || !stagedStartDate || !stagedEndDate}
				>
					Apply Date Range
				</button>
			</div>
		</div>
	{/if}
</div>
