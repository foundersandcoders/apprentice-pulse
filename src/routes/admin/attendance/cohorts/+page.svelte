<script lang="ts">
	import { resolve } from '$app/paths';
	import type { CohortAttendanceStats } from '$lib/types/attendance';

	let { data } = $props();

	// Type the data
	const cohortStats = $derived(data.cohortStats as CohortAttendanceStats[]);
	const dateRange = $derived(data.dateRange);

	// Sorting state
	type SortColumn = 'name' | 'attendanceRate' | 'totalEvents' | 'apprenticeCount';
	let sortColumn = $state<SortColumn>('attendanceRate');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Comparison state
	let selectedForComparison = $state<Set<string>>(new Set());
	let showComparison = $state(false);

	// Sorted cohort statistics
	const sortedCohortStats = $derived.by(() => {
		return [...cohortStats].sort((a, b) => {
			let comparison = 0;

			switch (sortColumn) {
				case 'name':
					comparison = a.cohortName.localeCompare(b.cohortName);
					break;
				case 'attendanceRate':
					comparison = a.attendanceRate - b.attendanceRate;
					break;
				case 'totalEvents':
					comparison = a.totalEvents - b.totalEvents;
					break;
				case 'apprenticeCount':
					comparison = a.apprenticeCount - b.apprenticeCount;
					break;
			}

			return sortDirection === 'asc' ? comparison : -comparison;
		});
	});

	function toggleSort(column: SortColumn) {
		if (sortColumn === column) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = column;
			sortDirection = column === 'attendanceRate' ? 'desc' : 'asc';
		}
	}

	function getSortIndicator(column: SortColumn): string {
		if (sortColumn !== column) return '';
		return sortDirection === 'asc' ? ' ↑' : ' ↓';
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

	function isLowAttendance(rate: number): boolean {
		return rate < 80;
	}

	// Comparison functions
	function toggleCohortForComparison(cohortId: string) {
		if (selectedForComparison.has(cohortId)) {
			selectedForComparison.delete(cohortId);
		} else {
			selectedForComparison.add(cohortId);
		}
		selectedForComparison = new Set(selectedForComparison);
	}

	function clearComparison() {
		selectedForComparison = new Set();
		showComparison = false;
	}

	function toggleComparisonView() {
		showComparison = !showComparison;
	}

	// Get cohorts selected for comparison
	const comparisonCohorts = $derived(
		cohortStats.filter(cohort => selectedForComparison.has(cohort.cohortId))
	);
</script>

<div class="p-6 max-w-6xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
		<h1 class="text-2xl font-bold mt-2">Cohort Attendance Metrics</h1>
		<p class="text-gray-600 mt-1">Aggregate attendance statistics and trends per cohort</p>
	</header>

	<!-- Summary Stats -->
	{#if cohortStats.length > 0}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
			<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
				<h3 class="text-sm font-medium text-blue-800">Total Cohorts</h3>
				<p class="text-2xl font-bold text-blue-900">{cohortStats.length}</p>
			</div>
			<div class="bg-green-50 border border-green-200 rounded-lg p-4">
				<h3 class="text-sm font-medium text-green-800">Average Attendance Rate</h3>
				<p class="text-2xl font-bold text-green-900">
					{(cohortStats.reduce((sum, c) => sum + c.attendanceRate, 0) / cohortStats.length).toFixed(1)}%
				</p>
			</div>
			<div class="bg-purple-50 border border-purple-200 rounded-lg p-4">
				<h3 class="text-sm font-medium text-purple-800">Total Apprentices</h3>
				<p class="text-2xl font-bold text-purple-900">
					{cohortStats.reduce((sum, c) => sum + c.apprenticeCount, 0)}
				</p>
			</div>
		</div>
	{/if}

	<!-- Comparison Controls -->
	{#if cohortStats.length > 1}
		<div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<h3 class="font-medium text-blue-900">Compare Cohorts</h3>
					<span class="text-sm text-blue-700">
						{selectedForComparison.size} selected
					</span>
				</div>
				<div class="flex items-center gap-2">
					{#if selectedForComparison.size >= 2}
						<button
							onclick={toggleComparisonView}
							class="px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
						>
							{showComparison ? 'Hide' : 'Show'} Comparison
						</button>
					{/if}
					{#if selectedForComparison.size > 0}
						<button
							onclick={clearComparison}
							class="px-3 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
						>
							Clear Selection
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Comparison View -->
	{#if showComparison && comparisonCohorts.length >= 2}
		<div class="mb-6 bg-white border rounded-lg overflow-hidden">
			<div class="px-4 py-3 border-b bg-gray-50">
				<h2 class="text-lg font-medium">Cohort Comparison</h2>
				<p class="text-sm text-gray-600 mt-1">
					Comparing {comparisonCohorts.length} cohorts side-by-side
				</p>
			</div>

			<div class="p-4">
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each comparisonCohorts as cohort (cohort.cohortId)}
						<div class="border rounded-lg p-4 {isLowAttendance(cohort.attendanceRate) ? 'border-red-200 bg-red-50' : 'border-gray-200'}">
							<div class="flex items-center justify-between mb-3">
								<h4 class="font-medium text-gray-900">{cohort.cohortName}</h4>
								<button
									onclick={() => toggleCohortForComparison(cohort.cohortId)}
									class="text-gray-400 hover:text-gray-600"
									title="Remove from comparison"
								>
									×
								</button>
							</div>

							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-600">Attendance Rate</span>
									<span class="text-lg font-bold {getAttendanceColor(cohort.attendanceRate)}">
										{cohort.attendanceRate}%
									</span>
								</div>

								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-600">Apprentices</span>
									<span class="font-medium">{cohort.apprenticeCount}</span>
								</div>

								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-600">Total Events</span>
									<span class="font-medium">{cohort.totalEvents}</span>
								</div>

								<div class="flex items-center justify-between">
									<span class="text-sm text-gray-600">Trend</span>
									<div class="flex items-center gap-1">
										<span class="{getTrendColor(cohort.trend.direction)}">
											{getTrendIcon(cohort.trend.direction)}
										</span>
										<span class="text-sm font-medium">
											{cohort.trend.change > 0 ? '+' : ''}{cohort.trend.change}%
										</span>
									</div>
								</div>

								<div class="pt-2 border-t">
									<div class="grid grid-cols-2 gap-2 text-xs text-gray-600">
										<div>
											<span class="block">Present: {cohort.present}</span>
											<span class="block">Late: {cohort.late}</span>
										</div>
										<div>
											<span class="block">Absent: {cohort.absent}</span>
											<span class="block">Excused: {cohort.excused}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Cohort Metrics Table -->
	{#if cohortStats.length === 0}
		<div class="text-center py-12">
			<div class="text-gray-400 text-4xl mb-4">📊</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">No cohort data available</h3>
			<p class="text-gray-600">Cohort attendance statistics will appear here once data is loaded.</p>
		</div>
	{:else}
		<div class="bg-white border rounded-lg overflow-hidden">
			<div class="px-4 py-3 border-b bg-gray-50">
				<h2 class="text-lg font-medium">Cohort Performance Overview</h2>
				<p class="text-sm text-gray-600 mt-1">
					{cohortStats.length} cohorts • Click column headers to sort
				</p>
			</div>

			<!-- Desktop Table -->
			<div class="hidden md:block overflow-x-auto">
				<table class="w-full">
					<thead class="bg-gray-50 border-b">
						<tr>
							<th class="px-4 py-3 w-12">
								<span class="text-xs text-gray-500">Compare</span>
							</th>
							<th class="px-4 py-3 text-left">
								<button
									onclick={() => toggleSort('name')}
									class="font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1"
								>
									Cohort{getSortIndicator('name')}
								</button>
							</th>
							<th class="px-4 py-3 text-left">
								<button
									onclick={() => toggleSort('apprenticeCount')}
									class="font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1"
								>
									Apprentices{getSortIndicator('apprenticeCount')}
								</button>
							</th>
							<th class="px-4 py-3 text-left">
								<button
									onclick={() => toggleSort('totalEvents')}
									class="font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1"
								>
									Events{getSortIndicator('totalEvents')}
								</button>
							</th>
							<th class="px-4 py-3 text-left">
								<button
									onclick={() => toggleSort('attendanceRate')}
									class="font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1"
								>
									Attendance Rate{getSortIndicator('attendanceRate')}
								</button>
							</th>
							<th class="px-4 py-3 text-left">
								<span class="font-medium text-gray-900">Trend</span>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each sortedCohortStats as cohort (cohort.cohortId)}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3">
									<input
										type="checkbox"
										checked={selectedForComparison.has(cohort.cohortId)}
										onchange={() => toggleCohortForComparison(cohort.cohortId)}
										class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
									/>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-2">
										<span class="font-medium">{cohort.cohortName}</span>
										{#if isLowAttendance(cohort.attendanceRate)}
											<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
												Low Attendance
											</span>
										{/if}
									</div>
								</td>
								<td class="px-4 py-3 text-gray-900">
									{cohort.apprenticeCount}
								</td>
								<td class="px-4 py-3 text-gray-900">
									{cohort.totalEvents}
								</td>
								<td class="px-4 py-3">
									<span class="font-medium {getAttendanceColor(cohort.attendanceRate)}">
										{cohort.attendanceRate}%
									</span>
								</td>
								<td class="px-4 py-3">
									<div class="flex items-center gap-1">
										<span class="{getTrendColor(cohort.trend.direction)}">
											{getTrendIcon(cohort.trend.direction)}
										</span>
										<span class="text-sm text-gray-600">
											{cohort.trend.change > 0 ? '+' : ''}{cohort.trend.change}%
										</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile Cards -->
			<div class="md:hidden space-y-4 p-4">
				{#each sortedCohortStats as cohort (cohort.cohortId)}
					<div class="border rounded-lg p-4 {isLowAttendance(cohort.attendanceRate) ? 'border-red-200 bg-red-50' : 'border-gray-200'}">
						<div class="flex items-start justify-between mb-3">
							<div class="flex items-start gap-3">
								<input
									type="checkbox"
									checked={selectedForComparison.has(cohort.cohortId)}
									onchange={() => toggleCohortForComparison(cohort.cohortId)}
									class="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
								/>
								<div>
									<h3 class="font-medium text-gray-900">{cohort.cohortName}</h3>
									{#if isLowAttendance(cohort.attendanceRate)}
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 mt-1">
											Low Attendance
										</span>
									{/if}
								</div>
							</div>
							<span class="text-lg font-bold {getAttendanceColor(cohort.attendanceRate)}">
								{cohort.attendanceRate}%
							</span>
						</div>

						<div class="grid grid-cols-3 gap-4 text-sm">
							<div>
								<span class="text-gray-600">Apprentices</span>
								<div class="font-medium">{cohort.apprenticeCount}</div>
							</div>
							<div>
								<span class="text-gray-600">Events</span>
								<div class="font-medium">{cohort.totalEvents}</div>
							</div>
							<div>
								<span class="text-gray-600">Trend</span>
								<div class="flex items-center gap-1">
									<span class="{getTrendColor(cohort.trend.direction)}">
										{getTrendIcon(cohort.trend.direction)}
									</span>
									<span class="text-xs">
										{cohort.trend.change > 0 ? '+' : ''}{cohort.trend.change}%
									</span>
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>