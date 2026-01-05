<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { ApprenticeAttendanceStats } from '$lib/types/attendance';
	import type { Cohort } from '$lib/airtable/sveltekit-wrapper';

	let { data } = $props();

	// Sorting state
	type SortColumn = 'name' | 'attendanceRate' | 'cohort';
	type SortDirection = 'asc' | 'desc';
	let sortColumn = $state<SortColumn>('name');
	let sortDirection = $state<SortDirection>('asc');

	// Type the data
	const apprentices = $derived(data.apprentices as ApprenticeAttendanceStats[]);
	const cohorts = $derived(data.cohorts as Cohort[]);
	const selectedCohortId = $derived(data.selectedCohortId as string | undefined);

	// Filtered and sorted apprentices
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

	function handleCohortChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const cohortId = select.value;
		const url = new URL(window.location.href);

		if (cohortId) {
			url.searchParams.set('cohort', cohortId);
		}
		else {
			url.searchParams.delete('cohort');
		}

		goto(url.toString(), { replaceState: true });
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

	<!-- Filters -->
	<div class="mb-6 flex flex-wrap gap-4 items-center">
		<div>
			<label for="cohort-filter" class="block text-sm font-medium text-gray-700 mb-1">
				Filter by Cohort
			</label>
			<select
				id="cohort-filter"
				class="border rounded-md px-3 py-2 text-sm"
				value={selectedCohortId ?? ''}
				onchange={handleCohortChange}
			>
				<option value="">All Cohorts</option>
				{#each cohorts as cohort}
					<option value={cohort.id}>{cohort.name}</option>
				{/each}
			</select>
		</div>

		<div class="text-sm text-gray-500 ml-auto">
			{sortedApprentices.length} apprentice{sortedApprentices.length !== 1 ? 's' : ''}
		</div>
	</div>

	<!-- Apprentices Table -->
	{#if sortedApprentices.length === 0}
		<div class="text-center py-12 text-gray-500">
			<p>No apprentices found</p>
			{#if selectedCohortId}
				<p class="text-sm mt-2">Try selecting a different cohort or view all cohorts</p>
			{/if}
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
					{#each sortedApprentices as apprentice}
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
								<!-- TODO: Link to individual apprentice view (task 8) -->
								<button
									class="text-blue-600 hover:underline text-sm"
									disabled
									title="Coming soon"
								>
									View Details
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
