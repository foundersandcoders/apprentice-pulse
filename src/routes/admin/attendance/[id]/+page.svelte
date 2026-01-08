<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto, invalidateAll } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import UnifiedAttendanceStatsCard from '$lib/components/UnifiedAttendanceStatsCard.svelte';
	import ExpandableAttendanceFilters from '$lib/components/ExpandableAttendanceFilters.svelte';
	import AttendanceChart from '$lib/components/AttendanceChart.svelte';
	import type { ApprenticeAttendanceStats, AttendanceHistoryEntry, AttendanceStatus } from '$lib/types/attendance';
	import { ATTENDANCE_STATUSES, getStatusBadgeClass, calculateMonthlyAttendance } from '$lib/types/attendance';
	import type { AttendanceFilters } from '$lib/types/filters';
	import { parseFiltersFromParams, filtersToParams } from '$lib/types/filters';
	import type { Term } from '$lib/airtable/sveltekit-wrapper';
	import { format } from 'date-fns';

	let { data } = $props();

	const stats = $derived(data.stats as ApprenticeAttendanceStats);
	const terms = $derived(data.terms as Term[]);
	const cohortsParam = $derived(data.cohortsParam as string);

	// Build back link - check if we came from search or cohort view
	const fromSearch = $derived(page.url.searchParams.get('from') === 'search');
	const backLink = $derived(
		fromSearch
			? resolve('/admin')
			: cohortsParam
			? `${resolve('/admin/attendance')}?cohorts=${cohortsParam}`
			: resolve('/admin/attendance'),
	);

	// Loading state - show when navigating back to cohort attendance list
	const isLoading = $derived(navigating.to?.url.pathname === '/admin/attendance');

	// History is mutable (user can edit status inline), so we need $state + $effect
	// eslint-disable-next-line svelte/prefer-writable-derived
	let history = $state<AttendanceHistoryEntry[]>([]);

	// Sync history when data changes
	$effect(() => {
		history = data.history as AttendanceHistoryEntry[];
	});

	// Calculate monthly attendance data for chart
	const monthlyChartData = $derived(calculateMonthlyAttendance(history));

	// Current filters from URL params
	const currentFilters = $derived<AttendanceFilters>(parseFiltersFromParams(page.url.searchParams));

	// Handle filter changes
	function handleFiltersChange(newFilters: AttendanceFilters) {
		const basePath = resolve(`/admin/attendance/${stats.apprenticeId}`);
		const filterParams = filtersToParams(newFilters);
		const newUrl = filterParams.toString() ? `${basePath}?${filterParams.toString()}` : basePath;
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath is already resolved
		goto(newUrl);
	}

	// Status editing state
	let editingEntryId = $state<string | null>(null);
	let editingStatus = $state<AttendanceStatus>('Present');
	let editingCheckinTime = $state<string>('');
	let statusUpdateLoading = $state(false);

	// Reason editing state (separate from status editing)
	let editingReasonFor = $state<string | null>(null);
	let reasonInput = $state<string>('');

	// When status changes to Present/Late and no check-in time is set, populate with event start time
	$effect(() => {
		if (editingEntryId && (editingStatus === 'Present' || editingStatus === 'Late') && !editingCheckinTime) {
			const entry = history.find(h => h.eventId === editingEntryId);
			if (entry) {
				editingCheckinTime = new Date(entry.eventDateTime).toISOString().slice(0, 16);
			}
		}
	});

	function formatDateTime(dateTime: string): string {
		try {
			return format(new Date(dateTime), 'dd MMM yyyy, HH:mm');
		}
		catch {
			return dateTime;
		}
	}

	function formatCheckinTime(checkinTime: string | null): string {
		if (!checkinTime) return '—';
		try {
			return format(new Date(checkinTime), 'HH:mm');
		}
		catch {
			return checkinTime;
		}
	}

	function startEditingStatus(entry: AttendanceHistoryEntry) {
		editingEntryId = entry.eventId;
		editingStatus = entry.status;

		// Set default checkin time to event start time or current time
		if (editingStatus === 'Present' || editingStatus === 'Late') {
			if (entry.checkinTime) {
				// Use existing checkin time
				editingCheckinTime = new Date(entry.checkinTime).toISOString().slice(0, 16);
			}
			else {
				// Use event start time as default
				editingCheckinTime = new Date(entry.eventDateTime).toISOString().slice(0, 16);
			}
		}
		else {
			editingCheckinTime = '';
		}
	}

	function cancelEditing() {
		editingEntryId = null;
		editingStatus = 'Present';
		editingCheckinTime = '';
	}

	// Start editing reason only (separate from status editing)
	function startEditingReason(entry: AttendanceHistoryEntry) {
		editingReasonFor = entry.eventId;
		reasonInput = entry.reason || '';
	}

	// Save reason only
	async function saveReasonChange() {
		if (!editingReasonFor) return;

		const entry = history.find(h => h.eventId === editingReasonFor);
		if (!entry || !entry.attendanceId) return;

		statusUpdateLoading = true;
		try {
			const response = await fetch(`/api/attendance/${entry.attendanceId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					status: entry.status,
					reason: reasonInput.trim() || null,
				}),
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Update the history entry
				history = history.map(entry =>
					entry.eventId === editingReasonFor
						? { ...entry, reason: reasonInput.trim() || null }
						: entry,
				);
				cancelReasonEditing();
			}
			else {
				console.error('Failed to update reason:', result.error);
				// Could add error handling here
			}
		}
		catch (error) {
			console.error('Network error updating reason:', error);
		}
		finally {
			statusUpdateLoading = false;
		}
	}

	// Cancel reason editing
	function cancelReasonEditing() {
		editingReasonFor = null;
		reasonInput = '';
	}

	// Handle Escape key to cancel editing
	$effect(() => {
		if (!editingEntryId) return;

		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				cancelEditing();
			}
		};

		document.addEventListener('keydown', handleKeydown);
		return () => document.removeEventListener('keydown', handleKeydown);
	});

	async function saveStatusChange() {
		if (!editingEntryId) return;

		const entry = history.find(h => h.eventId === editingEntryId);
		if (!entry) return;

		const hasExistingRecord = !!entry.attendanceId;
		const needsRecord = editingStatus !== 'Not Check-in';

		// Case: No record and changing to Not Check-in - just update local UI
		if (!hasExistingRecord && !needsRecord) {
			history = history.map(h =>
				h.eventId === entry.eventId
					? { ...h, status: editingStatus, checkinTime: null, attendanceId: null }
					: h,
			);
			editingEntryId = null;
			return;
		}

		statusUpdateLoading = true;
		try {
			const checkinTime = (editingStatus === 'Present' || editingStatus === 'Late')
				? new Date(editingCheckinTime).toISOString()
				: undefined;

			let result;

			console.log('Updating status:', {
				hasExistingRecord,
				eventId: entry.eventId,
				apprenticeId: stats.apprenticeId,
				status: editingStatus,
				checkinTime,
				attendanceId: entry.attendanceId,
			});

			if (hasExistingRecord) {
				// Update existing record
				const response = await fetch(`/api/attendance/${entry.attendanceId}`, {
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						status: editingStatus,
						checkinTime,
					}),
				});
				result = await response.json();
			}
			else {
				// Create new record
				const response = await fetch('/api/attendance', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						eventId: entry.eventId,
						apprenticeId: stats.apprenticeId,
						status: editingStatus,
						checkinTime,
					}),
				});
				result = await response.json();
			}

			if (result.success) {
				// Refetch all data to update stats card
				await invalidateAll();
			}
			else {
				console.error('Failed to update status:', result);
				alert('Failed to update status: ' + result.error);
			}
		}
		catch (error) {
			console.error('Error updating status:', error);
			alert('Failed to update status. Please try again.');
		}
		finally {
			statusUpdateLoading = false;
			editingEntryId = null;
		}
	}
</script>

<div class="p-6 max-w-6xl mx-auto">
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

	<header class="mb-6 flex justify-between items-start">
		<div>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- backLink is already resolved -->
			<a href={backLink} class="text-blue-600 hover:underline text-sm">← Back to {fromSearch ? 'Admin Dashboard' : 'Cohort Attendance'}</a>
			<h1 class="text-2xl font-bold mt-2">{stats.apprenticeName} - Attendance</h1>
			{#if stats.cohortName}
				<p class="text-gray-600 mt-1">{stats.cohortName}</p>
			{/if}
		</div>
	</header>

	<!-- Attendance Filters -->
	<div class="mb-6">
		<ExpandableAttendanceFilters
			{terms}
			filters={currentFilters}
			onFiltersChange={handleFiltersChange}
		/>
	</div>

	<!-- Stats Card -->
	<div class="mb-8">
		<UnifiedAttendanceStatsCard stats={stats} showLowAttendanceWarning={true} />
	</div>

	<!-- Attendance History -->
	<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
		<div class="flex justify-between items-center mb-4">
			<h2 class="text-xl font-semibold">Attendance History</h2>
			<span class="text-sm text-gray-500">{history.length} event{history.length !== 1 ? 's' : ''}</span>
		</div>

		{#if history.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>No events found for this apprentice</p>
			</div>
		{:else}
			<div class="overflow-x-auto -mx-6">
				<table class="w-full border-collapse">
					<thead>
						<tr class="bg-gray-50">
							<th class="text-left p-3 pl-6 border-b">Event</th>
							<th class="text-left p-3 border-b">Date & Time</th>
							<th class="text-center p-3 border-b">Status</th>
							<th class="text-center p-3 border-b">Check-in Time</th>
							<th class="text-center p-3 pr-6 border-b">Reason</th>
						</tr>
					</thead>
					<tbody>
						{#each history as entry (entry.eventId)}
							<tr class="border-b hover:bg-gray-50 transition-colors">
								<td class="p-3 pl-6">
									<div class="font-medium">{entry.eventName}</div>
								</td>
								<td class="p-3 text-gray-600">
									{formatDateTime(entry.eventDateTime)}
								</td>
								<td class="p-3 text-center">
									{#if editingEntryId === entry.eventId}
										<select
											bind:value={editingStatus}
											class="border border-gray-300 rounded-lg px-2 py-1 text-xs"
											onclick={e => e.stopPropagation()}
										>
											{#each ATTENDANCE_STATUSES as status (status)}
												<option value={status}>{status}</option>
											{/each}
										</select>
									{:else}
										<button
											onclick={() => startEditingStatus(entry)}
											class="px-2 py-1 rounded-full text-sm cursor-pointer {getStatusBadgeClass(entry.status)} hover:opacity-80 transition-opacity"
										>
											{entry.status}
										</button>
									{/if}
								</td>
								<td class="p-3 text-center">
									{#if editingEntryId === entry.eventId}
										<div class="flex items-center justify-center gap-2">
											{#if editingStatus === 'Present' || editingStatus === 'Late'}
												<input
													type="datetime-local"
													bind:value={editingCheckinTime}
													class="border border-gray-300 rounded-lg px-2 py-1 text-xs"
													onclick={e => e.stopPropagation()}
												/>
											{/if}
											<button
												onclick={saveStatusChange}
												disabled={statusUpdateLoading}
												class="px-2 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
											>
												{statusUpdateLoading ? '...' : '✓'}
											</button>
											<button
												onclick={cancelEditing}
												disabled={statusUpdateLoading}
												class="px-2 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
											>
												✕
											</button>
										</div>
									{:else if entry.checkinTime}
										<span class="text-gray-500 text-xs">{formatCheckinTime(entry.checkinTime)}</span>
									{:else}
										<span class="text-gray-400 text-xs">—</span>
									{/if}
								</td>
								<td class="p-3 pr-6 text-center">
									{#if entry.status === 'Absent' || entry.status === 'Excused'}
										{#if editingReasonFor === entry.eventId}
											<div class="flex flex-col gap-2 min-w-64">
												<textarea
													bind:value={reasonInput}
													placeholder="Add reason..."
													rows="3"
													class="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
													onclick={e => e.stopPropagation()}
												></textarea>
												<div class="flex justify-end gap-2">
													<button
														onclick={cancelReasonEditing}
														disabled={statusUpdateLoading}
														class="px-3 py-1 bg-gray-500 text-white text-xs rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
													>
														Cancel
													</button>
													<button
														onclick={saveReasonChange}
														disabled={statusUpdateLoading}
														class="px-3 py-1 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
													>
														{statusUpdateLoading ? 'Saving...' : 'Save'}
													</button>
												</div>
											</div>
										{:else}
											<button
												onclick={() => startEditingReason(entry)}
												class="text-gray-600 hover:text-blue-600 text-xs cursor-pointer transition-colors px-2 py-1 rounded hover:bg-gray-100"
											>
												{entry.reason ? entry.reason : 'Add reason...'}
											</button>
										{/if}
									{:else}
										<span class="text-gray-400 text-xs">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Attendance Trend Chart -->
	<div class="mt-8">
		<AttendanceChart data={monthlyChartData} title="Attendance Trend" />
	</div>
</div>
