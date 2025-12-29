<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();

	function formatDate(dateTime: string | undefined): string {
		if (!dateTime) return '—';
		const date = new Date(dateTime);
		if (isNaN(date.getTime())) return '—';
		return date.toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
		<h1 class="text-2xl font-bold mt-2">Events</h1>
	</header>

	{#if data.events.length === 0}
		<p class="text-gray-500">No events found.</p>
	{:else}
		<div class="overflow-x-auto">
			<table class="w-full border-collapse">
				<thead>
					<tr class="bg-gray-100 text-left">
						<th class="p-3 border-b font-semibold">Name</th>
						<th class="p-3 border-b font-semibold">Date/Time</th>
						<th class="p-3 border-b font-semibold">Type</th>
						<th class="p-3 border-b font-semibold">Cohort</th>
					</tr>
				</thead>
				<tbody>
					{#each data.events as event}
						<tr class="border-b hover:bg-gray-50">
							<td class="p-3">{event.name || '(Untitled)'}</td>
							<td class="p-3">{formatDate(event.dateTime)}</td>
							<td class="p-3">{event.eventType || '—'}</td>
							<td class="p-3">
								{#if event.cohortId}
									<span class="text-gray-500 text-sm" title={event.cohortId}>Cohort</span>
								{:else}
									<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Open</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<p class="text-gray-400 text-sm mt-4">Showing {data.events.length} event(s)</p>
	{/if}
</div>
