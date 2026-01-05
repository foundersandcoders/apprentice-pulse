<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/state';
	import { SvelteSet } from 'svelte/reactivity';
	import type { ApprenticeAttendanceStats } from '$lib/types/attendance';
	import type { Cohort } from '$lib/airtable/sveltekit-wrapper';

	let { data } = $props();

	// Type the data
	const apprentices = $derived(data.apprentices as ApprenticeAttendanceStats[]);
	const cohorts = $derived(data.cohorts as Cohort[]);
	const selectedCohortIds = $derived(data.selectedCohortIds as string[]);
	const needsSelection = $derived(data.needsSelection as boolean);
	const showAll = $derived(data.showAll as boolean);

	// Sort cohorts alphabetically by name
	const sortedCohorts = $derived([...cohorts].sort((a, b) => a.name.localeCompare(b.name)));

	// Local state for cohort selection - need $state for reassignment in $effect to work
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap, svelte/prefer-writable-derived
	let localSelectedCohorts = $state(new SvelteSet(selectedCohortIds));
	let showAllWarning = $state(false);

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

	function loadSelectedCohorts() {
		if (localSelectedCohorts.size === 0) return;
		const cohortIds = [...localSelectedCohorts].join(',');
		const basePath = resolve('/admin/attendance/apprentices');
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved, adding query params
		goto(`${basePath}?cohorts=${cohortIds}`);
	}

	function confirmShowAll() {
		showAllWarning = true;
	}

	function loadAll() {
		showAllWarning = false;
		const basePath = resolve('/admin/attendance/apprentices');
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved, adding query params
		goto(`${basePath}?all=true`);
	}

	function clearSelection() {
		const basePath = resolve('/admin/attendance/apprentices');
		goto(basePath);
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

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
				{#each sortedCohorts as cohort (cohort.id)}
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
