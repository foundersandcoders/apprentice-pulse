<script lang="ts">
	import type { EventBreakdownEntry } from '$lib/types/attendance';
	import { STATUS_STYLES } from '$lib/types/attendance';
	import { format } from 'date-fns';

	interface Props {
		events: EventBreakdownEntry[];
	}

	let { events }: Props = $props();

	function formatDate(dateTime: string): string {
		try {
			return format(new Date(dateTime), 'dd MMM yyyy');
		}
		catch {
			return dateTime;
		}
	}
</script>

<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-lg font-semibold">Event Breakdown</h2>
		<span class="text-sm text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
	</div>

	{#if events.length === 0}
		<div class="text-center py-8 text-gray-500">
			<p>No events found for selected period</p>
		</div>
	{:else}
		<div class="overflow-x-auto -mx-6">
			<table class="w-full border-collapse">
				<thead>
					<tr class="bg-gray-50">
						<th class="text-left p-3 pl-6 border-b">Event</th>
						<th class="text-left p-3 border-b">Date</th>
						<th class="text-center p-3 border-b">Present</th>
						<th class="text-center p-3 border-b">Late</th>
						<th class="text-center p-3 border-b">Excused</th>
						<th class="text-center p-3 border-b">Not Check-in</th>
						<th class="text-center p-3 pr-6 border-b">Absent</th>
					</tr>
				</thead>
				<tbody>
					{#each events as event (event.eventId)}
						<tr class="border-b hover:bg-gray-50 transition-colors">
							<td class="p-3 pl-6">
								<div class="font-medium">{event.eventName}</div>
							</td>
							<td class="p-3 text-gray-600">
								{formatDate(event.eventDateTime)}
							</td>
							<td class="p-3 text-center">
								<span class="{STATUS_STYLES['Present'].badge} px-3 py-0.5 rounded-full text-sm">
									{event.present}
								</span>
							</td>
							<td class="p-3 text-center">
								<span class="{STATUS_STYLES['Late'].badge} px-3 py-0.5 rounded-full text-sm">
									{event.late}
								</span>
							</td>
							<td class="p-3 text-center">
								<span class="{STATUS_STYLES['Excused'].badge} px-3 py-0.5 rounded-full text-sm">
									{event.excused}
								</span>
							</td>
							<td class="p-3 text-center">
								<span class="{STATUS_STYLES['Not Check-in'].badge} px-3 py-0.5 rounded-full text-sm">
									{event.notCheckin}
								</span>
							</td>
							<td class="p-3 pr-6 text-center">
								<span class="{STATUS_STYLES['Absent'].badge} px-3 py-0.5 rounded-full text-sm">
									{event.absent}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
