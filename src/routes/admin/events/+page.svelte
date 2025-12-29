<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
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

	function getCohortName(cohortId: string | undefined): string | null {
		if (!cohortId) return null;
		const cohort = data.cohorts.find((c) => c.id === cohortId);
		return cohort?.name ?? null;
	}

	function handleCohortFilter(event: Event) {
		const select = event.target as HTMLSelectElement;
		const cohortId = select.value;
		if (cohortId) {
			goto(`?cohort=${cohortId}`);
		}
		else {
			goto('?');
		}
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
		<h1 class="text-2xl font-bold mt-2">Events</h1>
	</header>

	<div class="mb-4 flex items-center justify-between">
		<div>
			<label for="cohort-filter" class="text-sm text-gray-600 mr-2">Filter by cohort:</label>
			<select
				id="cohort-filter"
				class="border rounded px-3 py-1.5"
				value={data.selectedCohortId ?? ''}
				onchange={handleCohortFilter}
			>
				<option value="">All cohorts</option>
				{#each data.cohorts as cohort}
					<option value={cohort.name}>{cohort.name}</option>
				{/each}
			</select>
		</div>
		<a
			href="/admin/events/new"
			class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
		>
			+ Add Event
		</a>
	</div>

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
									<span class="text-sm">{getCohortName(event.cohortId) || event.cohortId}</span>
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
