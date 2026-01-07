<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ApprenticeAttendanceCard from '$lib/components/ApprenticeAttendanceCard.svelte';
	import AttendanceFiltersComponent from '$lib/components/AttendanceFilters.svelte';
	import type { ApprenticeAttendanceStats, AttendanceHistoryEntry, AttendanceStatus } from '$lib/types/attendance';
	import { ATTENDANCE_STATUSES } from '$lib/types/attendance';
	import type { AttendanceFilters } from '$lib/types/filters';
	import { parseFiltersFromParams, filtersToParams } from '$lib/types/filters';
	import type { Term } from '$lib/airtable/sveltekit-wrapper';
	import { format } from 'date-fns';

	let { data } = $props();

	const stats = $derived(data.stats as ApprenticeAttendanceStats);
	const terms = $derived(data.terms as Term[]);
	// History is mutable (user can edit status inline), so we need $state + $effect
	// eslint-disable-next-line svelte/prefer-writable-derived
	let history = $state<AttendanceHistoryEntry[]>([]);

	// Sync history when data changes
	$effect(() => {
		history = data.history as AttendanceHistoryEntry[];
	});

	// Current filters from URL params
	const currentFilters = $derived<AttendanceFilters>(parseFiltersFromParams(page.url.searchParams));

	// Handle filter changes
	function handleFiltersChange(newFilters: AttendanceFilters) {
		const basePath = resolve(`/admin/attendance/apprentices/${stats.apprenticeId}`);
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

	// When status changes to Present/Late and no check-in time is set, populate with event start time
	$effect(() => {
		if (editingEntryId && (editingStatus === 'Present' || editingStatus === 'Late') && !editingCheckinTime) {
			const entry = history.find(h => h.eventId === editingEntryId);
			if (entry) {
				editingCheckinTime = new Date(entry.eventDateTime).toISOString().slice(0, 16);
			}
		}
	});

	function getStatusColor(status: string): string {
		switch (status) {
			case 'Present': return 'bg-green-100 text-green-800';
			case 'Late': return 'bg-yellow-100 text-yellow-800';
			case 'Absent': return 'bg-red-100 text-red-800';
			case 'Excused': return 'bg-blue-100 text-blue-800';
			case 'Not Coming': return 'bg-orange-100 text-orange-800';
			default: return 'bg-gray-100 text-gray-600';
		}
	}

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

	async function saveStatusChange() {
		if (!editingEntryId) return;

		const entry = history.find(h => h.eventId === editingEntryId);
		if (!entry) return;

		const hasExistingRecord = !!entry.attendanceId;
		const needsRecord = editingStatus !== 'Absent';

		// Case: No record and changing to Absent - just update local UI
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
				// Update local state
				history = history.map(h =>
					h.eventId === entry.eventId
						? {
								...h,
								status: editingStatus,
								checkinTime: checkinTime || null,
								attendanceId: result.attendance.id,
							}
						: h,
				);
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

<div class="p-6 max-w-4xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin/attendance/apprentices')} class="text-blue-600 hover:underline text-sm">← Back to Apprentices</a>
		<h1 class="text-2xl font-bold mt-2">{stats.apprenticeName}</h1>
		{#if stats.cohortName}
			<p class="text-gray-600 mt-1">{stats.cohortName}</p>
		{/if}
	</header>

	<!-- Attendance Filters -->
	<div class="mb-6">
		<AttendanceFiltersComponent
			{terms}
			filters={currentFilters}
			onFiltersChange={handleFiltersChange}
		/>
	</div>

	<!-- Stats Card -->
	<div class="mb-8">
		<ApprenticeAttendanceCard apprentice={stats} />
	</div>

	<!-- Attendance History -->
	<section>
		<h2 class="text-xl font-semibold mb-4">Attendance History</h2>

		{#if history.length === 0}
			<div class="text-center py-8 text-gray-500">
				<p>No events found for this apprentice</p>
			</div>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="bg-gray-50">
							<th class="text-left p-3 border-b">Event</th>
							<th class="text-left p-3 border-b">Date & Time</th>
							<th class="text-center p-3 border-b">Status</th>
							<th class="text-center p-3 border-b">Check-in Time</th>
							<th class="text-center p-3 border-b">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each history as entry (entry.eventId)}
							<tr class="border-b hover:bg-gray-50">
								<td class="p-3">
									<div class="font-medium">{entry.eventName}</div>
								</td>
								<td class="p-3 text-gray-600">
									{formatDateTime(entry.eventDateTime)}
								</td>
								<td class="p-3 text-center">
									{#if editingEntryId === entry.eventId}
										<select
											bind:value={editingStatus}
											class="border rounded px-1 py-0.5 text-xs"
											onclick={e => e.stopPropagation()}
										>
											{#each ATTENDANCE_STATUSES as status (status)}
												<option value={status}>{status}</option>
											{/each}
										</select>
									{:else}
										<button
											onclick={() => startEditingStatus(entry)}
											class="px-2 py-1 rounded-full text-sm {getStatusColor(entry.status)} hover:opacity-80"
										>
											{entry.status}
										</button>
									{/if}
								</td>
								<td class="p-3 text-center">
									{#if editingEntryId === entry.eventId && (editingStatus === 'Present' || editingStatus === 'Late')}
										<input
											type="datetime-local"
											bind:value={editingCheckinTime}
											class="border rounded px-1 py-0.5 text-xs"
											onclick={e => e.stopPropagation()}
										/>
									{:else if entry.checkinTime}
										<span class="text-gray-500 text-xs">{formatCheckinTime(entry.checkinTime)}</span>
									{:else}
										<span class="text-gray-400 text-xs">—</span>
									{/if}
								</td>
								<td class="p-3 text-center">
									{#if editingEntryId === entry.eventId}
										<div class="flex gap-1 justify-center">
											<button
												onclick={saveStatusChange}
												disabled={statusUpdateLoading}
												class="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 disabled:opacity-50"
											>
												{statusUpdateLoading ? '...' : '✓'}
											</button>
											<button
												onclick={cancelEditing}
												disabled={statusUpdateLoading}
												class="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 disabled:opacity-50"
											>
												✕
											</button>
										</div>
									{:else}
										<button
											onclick={() => startEditingStatus(entry)}
											class="px-2 py-1 text-xs text-blue-600 hover:text-blue-800"
										>
											Edit
										</button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
