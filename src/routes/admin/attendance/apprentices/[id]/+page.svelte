<script lang="ts">
	import { resolve } from '$app/paths';
	import ApprenticeAttendanceCard from '$lib/components/ApprenticeAttendanceCard.svelte';
	import type { ApprenticeAttendanceStats, AttendanceHistoryEntry } from '$lib/types/attendance';
	import { format } from 'date-fns';

	let { data } = $props();

	const stats = $derived(data.stats as ApprenticeAttendanceStats);
	const history = $derived(data.history as AttendanceHistoryEntry[]);

	function getStatusColor(status: string): string {
		switch (status) {
			case 'Present': return 'bg-green-100 text-green-800';
			case 'Late': return 'bg-yellow-100 text-yellow-800';
			case 'Absent': return 'bg-red-100 text-red-800';
			case 'Excused': return 'bg-blue-100 text-blue-800';
			case 'Not Coming': return 'bg-orange-100 text-orange-800';
			case 'Missed': return 'bg-gray-100 text-gray-600';
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
</script>

<div class="p-6 max-w-4xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin/attendance/apprentices')} class="text-blue-600 hover:underline text-sm">← Back to Apprentices</a>
		<h1 class="text-2xl font-bold mt-2">{stats.apprenticeName}</h1>
		{#if stats.cohortName}
			<p class="text-gray-600 mt-1">{stats.cohortName}</p>
		{/if}
	</header>

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
							<th class="text-right p-3 border-b">Check-in Time</th>
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
									<span class="px-2 py-1 rounded-full text-sm {getStatusColor(entry.status)}">
										{entry.status}
									</span>
								</td>
								<td class="p-3 text-right text-gray-600">
									{formatCheckinTime(entry.checkinTime)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
</div>
