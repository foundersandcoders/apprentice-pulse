<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import { SvelteSet, SvelteMap } from 'svelte/reactivity';
	import type { ApprenticeAttendanceStats } from '$lib/types/attendance';
	import type { Cohort, Term } from '$lib/airtable/sveltekit-wrapper';
	import type { AttendanceFilters } from '$lib/types/filters';
	import { filtersToParams, parseFiltersFromParams } from '$lib/types/filters';
	import AttendanceFiltersComponent from '$lib/components/AttendanceFilters.svelte';

	let { data } = $props();

	// Type the data
	const apprentices = $derived(data.apprentices as ApprenticeAttendanceStats[]);
	const cohorts = $derived(data.cohorts as Cohort[]);
	const terms = $derived(data.terms as Term[]);

	const selectedCohortIds = $derived(data.selectedCohortIds as string[]);
	const needsSelection = $derived(data.needsSelection as boolean);
	const showAll = $derived(data.showAll as boolean);

	// Current filters from URL params
	const currentFilters = $derived<AttendanceFilters>(parseFiltersFromParams(page.url.searchParams));

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

	// Sorting state
	type SortColumn = 'name' | 'attendanceRate' | 'cohort';
	type SortDirection = 'asc' | 'desc';
	let sortColumn = $state<SortColumn>('name');
	let sortDirection = $state<SortDirection>('asc');

	// Loading state
	const isLoading = $derived(navigating.to?.url.pathname === '/admin/attendance');

	// Reset local cohort selection when data changes
	$effect(() => {
		localSelectedCohorts = new SvelteSet(selectedCohortIds);
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
		const basePath = resolve('/admin/attendance');
		const filterParams = filtersToParams(currentFilters);
		filterParams.set('cohorts', cohortIds);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved, adding query params
		goto(`${basePath}?${filterParams.toString()}`);
	}

	const allCohortsSelected = $derived(cohorts.length > 0 && localSelectedCohorts.size === cohorts.length);

	function selectAllCohorts() {
		for (const cohort of cohorts) {
			localSelectedCohorts.add(cohort.id);
		}
	}

	function deselectAllCohorts() {
		localSelectedCohorts.clear();
	}

	function clearSelection() {
		const basePath = resolve('/admin/attendance');
		const filterParams = filtersToParams(currentFilters);
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved
		goto(filterParams.toString() ? `${basePath}?${filterParams.toString()}` : basePath);
	}

	function isLowAttendance(rate: number): boolean {
		return rate < 80;
	}

	function getAttendanceColor(rate: number): string {
		if (rate >= 90) return 'text-green-600';
		if (rate >= 80) return 'text-yellow-600';
		return 'text-red-600';
	}

	// Handle filter changes from the AttendanceFilters component
	function handleFiltersChange(newFilters: AttendanceFilters) {
		const basePath = resolve('/admin/attendance');
		const currentParams = new URLSearchParams(page.url.search);

		// Preserve cohort selection
		const cohortsParam = currentParams.get('cohorts');
		const allParam = currentParams.get('all');

		// Build new params from filters
		const filterParams = filtersToParams(newFilters);
		if (cohortsParam) filterParams.set('cohorts', cohortsParam);
		if (allParam) filterParams.set('all', allParam);

		const newUrl = filterParams.toString() ? `${basePath}?${filterParams.toString()}` : basePath;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved
		goto(newUrl);
	}

</script>

<div class="p-6 max-w-6xl mx-auto">
	<header class="mb-6 flex justify-between items-start">
		<div>
			<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
			{#if needsSelection}
				<h1 class="text-2xl font-bold mt-2">Attendance</h1>
			{:else}
				<h1 class="text-2xl font-bold mt-2">Cohort Attendance</h1>
			{/if}
		</div>
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
		<div class="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
				<h2 class="text-lg font-semibold">Select Cohorts</h2>
				<div class="flex flex-wrap gap-3">
					<button
						class="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						disabled={localSelectedCohorts.size === 0}
						onclick={loadSelectedCohorts}
					>
						Load Selected ({localSelectedCohorts.size})
					</button>
					<button
						class="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
						onclick={allCohortsSelected ? deselectAllCohorts : selectAllCohorts}
					>
						{allCohortsSelected ? 'Select None' : 'Select All'}
					</button>
				</div>
			</div>

			<div class="space-y-4">
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
						</button>
						<div class="flex flex-wrap gap-3">
							{#each group.cohorts as cohort (cohort.id)}
								<button
									class="p-3 border border-gray-200 rounded-xl text-left transition-all hover:shadow-md"
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

		</div>
	{:else}
		<!-- Attendance Filter -->
		<div class="mb-6">
			<AttendanceFiltersComponent
				{terms}
				filters={currentFilters}
				onFiltersChange={handleFiltersChange}
			/>
		</div>

		<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
			<!-- Filters & Controls -->
			<div class="mb-6 flex flex-wrap gap-4 items-center">
				<div class="flex flex-wrap gap-2 items-center">
					<span class="text-sm text-gray-600">Showing:</span>
					{#if showAll}
						<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">All Cohorts</span>
					{:else}
						{#each selectedCohortIds as cohortId (cohortId)}
							{@const cohort = cohorts.find(c => c.id === cohortId)}
							{#if cohort}
								<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">{cohort.name}</span>
							{/if}
						{/each}
					{/if}
					<button
						class="text-blue-600 hover:underline text-sm transition-colors"
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
				<div class="overflow-x-auto -mx-6">
					<table class="w-full border-collapse">
						<thead>
							<tr class="bg-gray-50">
								<th
									class="text-left p-3 pl-6 border-b cursor-pointer hover:bg-gray-100 transition-colors"
									onclick={() => toggleSort('name')}
								>
									Name{getSortIndicator('name')}
								</th>
								<th
									class="text-left p-3 border-b cursor-pointer hover:bg-gray-100 transition-colors"
									onclick={() => toggleSort('cohort')}
								>
									Cohort{getSortIndicator('cohort')}
								</th>
								<th
									class="text-right p-3 border-b cursor-pointer hover:bg-gray-100 transition-colors"
									onclick={() => toggleSort('attendanceRate')}
								>
									Attendance Rate{getSortIndicator('attendanceRate')}
								</th>
								<th class="text-right p-3 border-b">Attended</th>
								<th class="text-right p-3 pr-6 border-b">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each sortedApprentices as apprentice (apprentice.apprenticeId)}
								<tr class="border-b hover:bg-gray-50 transition-colors" class:bg-red-50={isLowAttendance(apprentice.attendanceRate)}>
									<td class="p-3 pl-6">
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
									<td class="p-3 pr-6 text-right">
										<a
											href="{resolve(`/admin/attendance/${apprentice.apprenticeId}`)}?cohorts={selectedCohortIds.join(',')}"
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
		</div>
	{/if}
</div>
