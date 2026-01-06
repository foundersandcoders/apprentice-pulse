<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import { resolve } from '$app/paths';
	import { navigating } from '$app/state';
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
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
	// eslint-disable-next-line svelte/no-unnecessary-state-wrap
	let selectedForComparison = $state(new SvelteSet<string>());
	let showComparison = $state(false);

	// Date filter state
	let showDateFilter = $state(false);
	let startDate = $state('');
	let endDate = $state('');

	// Initialize date filter values from URL
	$effect(() => {
		startDate = dateRange.start || '';
		endDate = dateRange.end || '';
	});

	// Today's date for input max
	const today = new Date().toISOString().split('T')[0];

	// Loading state
	const isLoading = $derived(navigating.to?.url.pathname === '/admin/attendance/cohorts');

	// Error handling
	const hasData = $derived(cohortStats.length > 0);
	const hasError = $derived(!hasData && !isLoading);

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
		}
		else {
			selectedForComparison.add(cohortId);
		}
		selectedForComparison = new SvelteSet(selectedForComparison);
	}

	function clearComparison() {
		selectedForComparison = new SvelteSet();
		showComparison = false;
	}

	function toggleComparisonView() {
		showComparison = !showComparison;
	}

	// Get cohorts selected for comparison
	const comparisonCohorts = $derived(
		cohortStats.filter(cohort => selectedForComparison.has(cohort.cohortId)),
	);

	// Date filter functions
	function toggleDateFilter() {
		showDateFilter = !showDateFilter;
	}

	function applyDateFilter() {
		try {
			// Validate date inputs
			if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
				alert('Start date must be before end date');
				return;
			}

			const params = new SvelteURLSearchParams();
			if (startDate) params.set('start', startDate);
			if (endDate) params.set('end', endDate);

			const newUrl = `/admin/attendance/cohorts${params.toString() ? '?' + params.toString() : ''}`;
			window.location.href = newUrl;
		}
		catch (error) {
			console.error('Date filter error:', error);
			alert('Failed to apply date filter. Please try again.');
		}
	}

	function clearDateFilter() {
		startDate = '';
		endDate = '';
		window.location.href = '/admin/attendance/cohorts';
	}

	function formatDateDisplay(dateStr: string): string {
		if (!dateStr) return '';
		return new Date(dateStr).toLocaleDateString();
	}

	// Export functions
	function exportToCSV() {
		try {
			if (sortedCohortStats.length === 0) {
				alert('No data available to export');
				return;
			}

			const headers = [
				'Cohort Name',
				'Apprentice Count',
				'Total Events',
				'Attendance Rate (%)',
				'Present',
				'Late',
				'Absent',
				'Excused',
				'Trend Direction',
				'Trend Change (%)',
			];

			const rows = sortedCohortStats.map(cohort => [
				cohort.cohortName,
				cohort.apprenticeCount.toString(),
				cohort.totalEvents.toString(),
				cohort.attendanceRate.toString(),
				cohort.present.toString(),
				cohort.late.toString(),
				cohort.absent.toString(),
				cohort.excused.toString(),
				cohort.trend.direction,
				cohort.trend.change.toString(),
			]);

			const csvContent = [
				headers.join(','),
				...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
			].join('\n');

			const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
			const link = document.createElement('a');

			const url = URL.createObjectURL(blob);
			link.setAttribute('href', url);

			const dateStr = new Date().toISOString().split('T')[0];
			const filename = `cohort-attendance-metrics-${dateStr}.csv`;
			link.setAttribute('download', filename);

			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Clean up
			URL.revokeObjectURL(url);
		}
		catch (error) {
			console.error('Export failed:', error);
			alert('Failed to export data. Please try again.');
		}
	}
</script>

<div class="p-4 sm:p-6 max-w-6xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
		<div class="flex flex-wrap items-center justify-between gap-4 mt-2">
			<div>
				<h1 class="text-xl sm:text-2xl font-bold">Cohort Attendance Metrics</h1>
				<p class="text-gray-600 mt-1">Aggregate attendance statistics and trends per cohort</p>
			</div>
			<div class="flex flex-wrap items-center gap-2">
				<button
					onclick={toggleDateFilter}
					class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
				>
					📅 Date Filter
					{#if dateRange.start || dateRange.end}
						<span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
							Active
						</span>
					{/if}
				</button>
				{#if cohortStats.length > 0}
					<button
						onclick={exportToCSV}
						class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
						title="Export data to CSV"
					>
						📊 Export CSV
					</button>
				{/if}
			</div>
		</div>
	</header>

	<!-- Loading Overlay -->
	{#if isLoading}
		<div class="fixed inset-0 bg-white/80 flex items-center justify-center z-50">
			<div class="text-center">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
				<p class="text-gray-600 font-medium">Loading cohort metrics...</p>
				<p class="text-gray-500 text-sm mt-1">This may take a moment</p>
			</div>
		</div>
	{/if}

	<!-- Date Filter Panel -->
	{#if showDateFilter}
		<div class="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
			<h3 class="text-lg font-medium text-gray-900 mb-4">Filter by Date Range</h3>

			{#if dateRange.start || dateRange.end}
				<div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
					<div class="flex items-center justify-between">
						<div class="text-sm text-blue-700">
							<strong>Current Filter:</strong>
							{#if dateRange.start && dateRange.end}
								{formatDateDisplay(dateRange.start)} to {formatDateDisplay(dateRange.end)}
							{:else if dateRange.start}
								From {formatDateDisplay(dateRange.start)}
							{:else if dateRange.end}
								Until {formatDateDisplay(dateRange.end)}
							{/if}
						</div>
						<button
							onclick={clearDateFilter}
							class="text-sm text-blue-600 hover:text-blue-800 underline"
						>
							Clear Filter
						</button>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div>
					<label for="startDate" class="block text-sm font-medium text-gray-700 mb-1">
						Start Date
					</label>
					<input
						id="startDate"
						type="date"
						bind:value={startDate}
						max={today}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label for="endDate" class="block text-sm font-medium text-gray-700 mb-1">
						End Date
					</label>
					<input
						id="endDate"
						type="date"
						bind:value={endDate}
						max={today}
						class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div class="flex items-end gap-2">
					<button
						onclick={applyDateFilter}
						class="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
					>
						Apply Filter
					</button>
					<button
						onclick={() => {
							startDate = '';
							endDate = '';
						}}
						class="px-4 py-2 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
					>
						Reset
					</button>
				</div>
			</div>

			<p class="text-xs text-gray-500 mt-3">
				<strong>Note:</strong> Date filtering is not fully implemented in the backend yet. This interface is prepared for future enhancement.
			</p>
		</div>
	{/if}

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
								<a
																		href={`${resolve('/admin/attendance/apprentices')}?cohorts=${cohort.cohortId}`}
									class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
								>
									{cohort.cohortName}
								</a>
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
	{#if hasError}
		<div class="text-center py-12">
			<div class="text-red-400 text-4xl mb-4">⚠️</div>
			<h3 class="text-lg font-medium text-gray-900 mb-2">Failed to load cohort data</h3>
			<p class="text-gray-600 mb-4">There was an error loading the cohort attendance statistics.</p>
			<button
				onclick={() => window.location.reload()}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
			>
				Try Again
			</button>
		</div>
	{:else if !hasData}
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
																				<a
											href={`${resolve('/admin/attendance/apprentices')}?cohorts=${cohort.cohortId}`}
											class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
										>
											{cohort.cohortName}
										</a>
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
																		<a
										href={`${resolve('/admin/attendance/apprentices')}?cohorts=${cohort.cohortId}`}
										class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
									>
										{cohort.cohortName}
									</a>
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
