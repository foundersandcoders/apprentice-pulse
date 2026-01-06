<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import type { ApprenticeAttendanceStats } from '$lib/types/attendance';
	import type { Cohort, Term } from '$lib/airtable/sveltekit-wrapper';

	let { data } = $props();

	// Type the data
	const apprentices = $derived(data.apprentices as ApprenticeAttendanceStats[]);
	const cohorts = $derived(data.cohorts as Cohort[]);
	const terms = $derived(data.terms as Term[]);
	const selectedCohortIds = $derived(data.selectedCohortIds as string[]);
	const serverSelectedTermIds = $derived(data.selectedTermIds as string[]);
	const needsSelection = $derived(data.needsSelection as boolean);
	const showAll = $derived(data.showAll as boolean);

	// Group cohorts by prefix and sort
	const groupedCohorts = $derived.by(() => {
		const groups = new SvelteMap<string, Cohort[]>();

		for (const cohort of cohorts) {
			// For MLX cohorts, group them all under "MLX"
			if (cohort.name.toLowerCase().includes('mlx')) {
				const mlxKey = 'MLX';
				if (!groups.has(mlxKey)) {
					groups.set(mlxKey, []);
				}
				groups.get(mlxKey)!.push(cohort);
			}
			else {
				// Extract prefix (e.g., "FAC29" from "FAC29.2")
				const prefix = cohort.name.match(/^([A-Z]+\d*)/)?.[1] || cohort.name;

				if (!groups.has(prefix)) {
					groups.set(prefix, []);
				}
				groups.get(prefix)!.push(cohort);
			}
		}

		// Sort groups - newer cohorts (higher numbers) first, MLX always last
		return Array.from(groups.entries())
			.sort(([a], [b]) => {
				// MLX always goes to the bottom
				if (a === 'MLX') return 1;
				if (b === 'MLX') return -1;

				// Extract numbers from prefixes for comparison
				const aNum = a.match(/\d+$/)?.[0];
				const bNum = b.match(/\d+$/)?.[0];

				// If both have numbers, sort by number (descending - newer first)
				if (aNum && bNum) {
					return parseInt(bNum) - parseInt(aNum);
				}

				// If only one has a number, prioritize it
				if (aNum) return -1;
				if (bNum) return 1;

				// Fallback to alphabetical
				return a.localeCompare(b);
			})
			.map(([prefix, cohorts]) => ({
				prefix,
				cohorts: cohorts.sort((a, b) => a.name.localeCompare(b.name)),
			}));
	});

	// Local state for cohort selection - need $state for reassignment in $effect to work
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap, svelte/prefer-writable-derived
	let localSelectedCohorts = $state(new SvelteSet());
	let showAllWarning = $state(false);

	// Term filter state - initialize from server data
	let selectedTermIds = $state<string[]>([]);

	// Sorting state
	type SortColumn = 'name' | 'attendanceRate' | 'cohort';
	type SortDirection = 'asc' | 'desc';
	let sortColumn = $state<SortColumn>('name');
	let sortDirection = $state<SortDirection>('asc');

	// Loading state
	const isLoading = $derived(navigating.to?.url.pathname === '/admin/attendance/apprentices');

	// Reset local selection when data changes
	$effect(() => {
		localSelectedCohorts = new SvelteSet(selectedCohortIds);
		selectedTermIds = [...serverSelectedTermIds];
	});

	// Sorted apprentices
	let sortedApprentices = $derived.by(() => {
		return [...apprentices].sort((a, b) => {
			let comparison = 0;

			switch (sortColumn) {
				case 'name':
					comparison = a.apprenticeName.localeCompare(b.apprenticeName);
					break;
				case 'attendanceRate':
					comparison = a.attendanceRate - b.attendanceRate;
					break;
				case 'cohort':
					comparison = (a.cohortName || '').localeCompare(b.cohortName || '');
					break;
			}

			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	function toggleSort(column: SortColumn) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		}
		else {
			sortColumn = column;
			sortDirection = column === 'attendanceRate' ? 'desc' : 'asc';
		}
	}

	function getSortIndicator(column: SortColumn): string {
		if (sortColumn !== column) return '';
		return sortDirection === 'asc' ? ' ↑' : ' ↓';
	}

	function toggleCohort(cohortId: string) {
		if (localSelectedCohorts.has(cohortId)) {
			localSelectedCohorts.delete(cohortId);
		}
		else {
			localSelectedCohorts.add(cohortId);
		}
	}

	function toggleGroup(groupCohorts: Cohort[]) {
		const groupCohortIds = groupCohorts.map(c => c.id);
		const allSelected = groupCohortIds.every(id => localSelectedCohorts.has(id));

		if (allSelected) {
			// Deselect all in group
			groupCohortIds.forEach(id => localSelectedCohorts.delete(id));
		}
		else {
			// Select all in group
			groupCohortIds.forEach(id => localSelectedCohorts.add(id));
		}
	}

	function isGroupSelected(groupCohorts: Cohort[]): boolean {
		const groupCohortIds = groupCohorts.map(c => c.id);
		return groupCohortIds.every(id => localSelectedCohorts.has(id));
	}

	function isGroupPartiallySelected(groupCohorts: Cohort[]): boolean {
		const groupCohortIds = groupCohorts.map(c => c.id);
		const selectedCount = groupCohortIds.filter(id => localSelectedCohorts.has(id)).length;
		return selectedCount > 0 && selectedCount < groupCohortIds.length;
	}

	function loadSelectedCohorts() {
		if (localSelectedCohorts.size === 0) return;
		const cohortIds = [...localSelectedCohorts].join(',');
		const basePath = resolve('/admin/attendance/apprentices');
		const params = new URLSearchParams();
		params.set('cohorts', cohortIds);
		if (selectedTermIds.length > 0) {
			params.set('terms', selectedTermIds.join(','));
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved, adding query params
		goto(`${basePath}?${params.toString()}`);
	}

	function confirmShowAll() {
		showAllWarning = true;
	}

	function loadAll() {
		showAllWarning = false;
		const basePath = resolve('/admin/attendance/apprentices');
		const params = new URLSearchParams();
		params.set('all', 'true');
		if (selectedTermIds.length > 0) {
			params.set('terms', selectedTermIds.join(','));
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved, adding query params
		goto(`${basePath}?${params.toString()}`);
	}

	function clearSelection() {
		const basePath = resolve('/admin/attendance/apprentices');
		const params = new URLSearchParams();
		if (selectedTermIds.length > 0) {
			params.set('terms', selectedTermIds.join(','));
		}
		goto(params.toString() ? `${basePath}?${params.toString()}` : basePath);
	}

	function isLowAttendance(rate: number): boolean {
		return rate < 80;
	}

	function getAttendanceColor(rate: number): string {
		if (rate >= 90) return 'text-green-600';
		if (rate >= 80) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
		switch (direction) {
			case 'up': return '↗';
			case 'down': return '↘';
			case 'stable': return '→';
		}
	}

	function getTrendColor(direction: 'up' | 'down' | 'stable'): string {
		switch (direction) {
			case 'up': return 'text-green-600';
			case 'down': return 'text-red-600';
			case 'stable': return 'text-gray-500';
		}
	}

	// Handle term selection change
	function onTermChange() {
		const basePath = resolve('/admin/attendance/apprentices');
		const currentParams = new URLSearchParams(page.url.search);
		if (selectedTermIds.length === 0) {
			currentParams.delete('terms');
		} else {
			currentParams.set('terms', selectedTermIds.join(','));
		}
		const newUrl = currentParams.toString() ? `${basePath}?${currentParams.toString()}` : basePath;
		goto(newUrl);
	}

	// Toggle term selection
	function toggleTermSelection(termId: string) {
		const index = selectedTermIds.indexOf(termId);
		if (index === -1) {
			selectedTermIds.push(termId);
		} else {
			selectedTermIds.splice(index, 1);
		}
		onTermChange();
	}

	// Format date for display (DD/MM/YYYY)
	function formatDateShort(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

</script>

<div class="p-6 max-w-6xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
		<h1 class="text-2xl font-bold mt-2">Apprentice Attendance</h1>
		<p class="text-gray-600 mt-1">Track individual apprentice attendance history and rates</p>
	</header>

	<!-- Loading Overlay -->
	{#if isLoading}
		<div class="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
			<div class="text-center">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
				<p class="text-gray-600 font-medium">Loading attendance data...</p>
				<p class="text-gray-500 text-sm mt-1">This may take a moment</p>
			</div>
		</div>
	{/if}

	<!-- Cohort Selection (shown when no data loaded) -->
	{#if needsSelection}
		<div class="bg-white border rounded-lg p-6 shadow-sm">
			<h2 class="text-lg font-semibold mb-4">Select Cohorts</h2>
			<p class="text-gray-600 mb-4">Choose one or more cohorts to view apprentice attendance data.</p>

			<div class="space-y-4 mb-6">
				{#each groupedCohorts as group (group.prefix)}
					<div>
						<button
							class="text-sm font-medium mb-2 px-2 py-1 rounded transition-colors cursor-pointer hover:bg-blue-50 flex items-center gap-2"
							class:text-blue-700={isGroupSelected(group.cohorts)}
							class:bg-blue-50={isGroupSelected(group.cohorts)}
							class:text-orange-700={isGroupPartiallySelected(group.cohorts)}
							class:bg-orange-50={isGroupPartiallySelected(group.cohorts)}
							class:text-gray-700={!isGroupSelected(group.cohorts) && !isGroupPartiallySelected(group.cohorts)}
							onclick={() => toggleGroup(group.cohorts)}
						>
							{#if isGroupSelected(group.cohorts)}
								<span class="text-blue-600">✓</span>
							{:else if isGroupPartiallySelected(group.cohorts)}
								<span class="text-orange-600">◐</span>
							{:else}
								<span class="text-gray-400">○</span>
							{/if}
							{group.prefix}
							<span class="text-xs opacity-75">({group.cohorts.length} cohort{group.cohorts.length !== 1 ? 's' : ''})</span>
						</button>
						<div class="flex flex-wrap gap-3">
							{#each group.cohorts as cohort (cohort.id)}
								<button
									class="p-3 border rounded-lg text-left transition-colors"
									class:bg-blue-50={localSelectedCohorts.has(cohort.id)}
									class:border-blue-500={localSelectedCohorts.has(cohort.id)}
									class:hover:bg-gray-50={!localSelectedCohorts.has(cohort.id)}
									onclick={() => toggleCohort(cohort.id)}
								>
									<div class="font-medium">{cohort.name}</div>
									<div class="text-sm text-gray-500">{cohort.apprenticeCount} apprentices</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>

			<div class="flex flex-wrap gap-3">
				<button
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					disabled={localSelectedCohorts.size === 0}
					onclick={loadSelectedCohorts}
				>
					Load Selected ({localSelectedCohorts.size})
				</button>

				<button
					class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
					onclick={confirmShowAll}
				>
					Show All Apprentices
				</button>
			</div>

			<!-- Show All Warning Modal -->
			{#if showAllWarning}
				<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div class="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
						<h3 class="text-lg font-semibold mb-2">Load All Apprentices?</h3>
						<p class="text-gray-600 mb-4">
							Loading attendance data for all cohorts may take 30 seconds or more depending on the number of apprentices.
						</p>
						<div class="flex gap-3 justify-end">
							<button
								class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
								onclick={() => showAllWarning = false}
							>
								Cancel
							</button>
							<button
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
								onclick={loadAll}
							>
								Yes, Load All
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- Term Filter -->
		{#if terms.length > 0}
			<div class="mb-4 p-4 bg-gray-50 border rounded-lg">
				<h3 class="text-sm font-medium text-gray-900 mb-3">Filter by Term</h3>
				<div class="space-y-2 max-h-40 overflow-y-auto">
					{#each terms as term (term.id)}
						{@const startDate = formatDateShort(term.startingDate)}
						{@const endDate = formatDateShort(term.endDate)}
						<label class="flex items-center space-x-2 cursor-pointer">
							<input
								type="checkbox"
								checked={selectedTermIds.includes(term.id)}
								onchange={() => toggleTermSelection(term.id)}
								class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							/>
							<span class="text-sm text-gray-700">
								{term.name} ({startDate} - {endDate})
							</span>
						</label>
					{/each}
				</div>
				{#if selectedTermIds.length > 0}
					<div class="mt-3 pt-3 border-t border-gray-200">
						<button
							onclick={() => { selectedTermIds = []; onTermChange(); }}
							class="text-xs text-blue-600 hover:text-blue-800 font-medium"
						>
							Clear all term filters
						</button>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Filters & Controls -->
		<div class="mb-6 flex flex-wrap gap-4 items-center">
			<div class="flex flex-wrap gap-2 items-center">
				<span class="text-sm text-gray-600">Showing:</span>
				{#if showAll}
					<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">All Cohorts</span>
				{:else}
					{#each selectedCohortIds as cohortId (cohortId)}
						{@const cohort = cohorts.find(c => c.id === cohortId)}
						{#if cohort}
							<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">{cohort.name}</span>
						{/if}
					{/each}
				{/if}
				<button
					class="text-blue-600 hover:underline text-sm"
					onclick={clearSelection}
				>
					Change selection
				</button>
			</div>

			<div class="text-sm text-gray-500 ml-auto">
				{sortedApprentices.length} apprentice{sortedApprentices.length !== 1 ? 's' : ''}
			</div>
		</div>

		<!-- Apprentices Table -->
		{#if sortedApprentices.length === 0}
			<div class="text-center py-12 text-gray-500">
				<p>No apprentices found</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="bg-gray-50">
							<th
								class="text-left p-3 border-b cursor-pointer hover:bg-gray-100"
								onclick={() => toggleSort('name')}
							>
								Name{getSortIndicator('name')}
							</th>
							<th
								class="text-left p-3 border-b cursor-pointer hover:bg-gray-100"
								onclick={() => toggleSort('cohort')}
							>
								Cohort{getSortIndicator('cohort')}
							</th>
							<th
								class="text-right p-3 border-b cursor-pointer hover:bg-gray-100"
								onclick={() => toggleSort('attendanceRate')}
							>
								Attendance Rate{getSortIndicator('attendanceRate')}
							</th>
							<th class="text-right p-3 border-b">Attended</th>
							<th class="text-right p-3 border-b">Trend</th>
							<th class="text-right p-3 border-b">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each sortedApprentices as apprentice (apprentice.apprenticeId)}
							<tr class="border-b hover:bg-gray-50" class:bg-red-50={isLowAttendance(apprentice.attendanceRate)}>
								<td class="p-3">
									<div class="font-medium">{apprentice.apprenticeName}</div>
								</td>
								<td class="p-3 text-gray-600">
									{apprentice.cohortName || '—'}
								</td>
								<td class="p-3 text-right">
									<span class="font-semibold {getAttendanceColor(apprentice.attendanceRate)}">
										{apprentice.attendanceRate.toFixed(0)}%
									</span>
									{#if isLowAttendance(apprentice.attendanceRate)}
										<span class="ml-1 text-red-500" title="Low attendance">⚠</span>
									{/if}
								</td>
								<td class="p-3 text-right text-gray-600">
									{apprentice.attended}/{apprentice.totalEvents}
								</td>
								<td class="p-3 text-right">
									<span class={getTrendColor(apprentice.trend.direction)} title="{apprentice.trend.change > 0 ? '+' : ''}{apprentice.trend.change.toFixed(1)}%">
										{getTrendIcon(apprentice.trend.direction)}
									</span>
								</td>
								<td class="p-3 text-right">
									<a
										href={resolve(`/admin/attendance/apprentices/${apprentice.apprenticeId}`)}
										class="text-blue-600 hover:underline text-sm"
									>
										View Details
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
