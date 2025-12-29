<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	let { data } = $props();

	// Format datetime for input (needs YYYY-MM-DDTHH:MM format)
	function formatDateTimeForInput(isoString: string): string {
		const date = new Date(isoString);
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	}

	// Form state - intentionally captures initial values for editing
	// svelte-ignore state_referenced_locally
	let name = $state(data.event.name);
	// svelte-ignore state_referenced_locally
	let dateTime = $state(formatDateTimeForInput(data.event.dateTime));
	// svelte-ignore state_referenced_locally
	let cohortId = $state(data.event.cohortId || '');
	// svelte-ignore state_referenced_locally
	let eventType = $state(data.event.eventType);
	// svelte-ignore state_referenced_locally
	let isPublic = $state(data.event.isPublic);
	// svelte-ignore state_referenced_locally
	let checkInCode = $state<number | undefined>(data.event.checkInCode);
	// svelte-ignore state_referenced_locally
	let surveyUrl = $state(data.event.surveyUrl || data.defaultSurveyUrl);

	let error = $state('');
	let submitting = $state(false);
	let showDeleteConfirm = $state(false);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		submitting = true;

		try {
			const response = await fetch(`/api/events/${data.event.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					dateTime: new Date(dateTime).toISOString(),
					cohortId: cohortId || undefined,
					eventType,
					isPublic,
					checkInCode: checkInCode || undefined,
					surveyUrl: surveyUrl || undefined,
				}),
			});

			const result = await response.json();

			if (!result.success) {
				error = result.error || 'Failed to update event';
				return;
			}

			goto(resolve('/admin/events'));
		}
		catch {
			error = 'Failed to update event';
		}
		finally {
			submitting = false;
		}
	}

	async function handleDelete() {
		submitting = true;

		try {
			const response = await fetch(`/api/events/${data.event.id}`, {
				method: 'DELETE',
			});

			const result = await response.json();

			if (!result.success) {
				error = result.error || 'Failed to delete event';
				showDeleteConfirm = false;
				return;
			}

			goto(resolve('/admin/events'));
		}
		catch {
			error = 'Failed to delete event';
			showDeleteConfirm = false;
		}
		finally {
			submitting = false;
		}
	}
</script>

<div class="p-6 max-w-2xl mx-auto">
	<a href={resolve('/admin/events')} class="text-blue-600 hover:underline text-sm">← Back to Events</a>
	<h1 class="text-2xl font-bold mt-2 mb-6">Edit Event</h1>

	{#if error}
		<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
			{error}
		</div>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
				Name <span class="text-red-500">*</span>
			</label>
			<input
				type="text"
				id="name"
				bind:value={name}
				required
				class="w-full border rounded px-3 py-2"
			/>
		</div>

		<div>
			<label for="dateTime" class="block text-sm font-medium text-gray-700 mb-1">
				Date & Time <span class="text-red-500">*</span>
			</label>
			<input
				type="datetime-local"
				id="dateTime"
				bind:value={dateTime}
				required
				class="w-full border rounded px-3 py-2"
			/>
		</div>

		<div>
			<label for="eventType" class="block text-sm font-medium text-gray-700 mb-1">
				Event Type <span class="text-red-500">*</span>
			</label>
			<select
				id="eventType"
				bind:value={eventType}
				required
				class="w-full border rounded px-3 py-2"
			>
				<option value="Regular class">Regular class</option>
				<option value="Workshop">Workshop</option>
				<option value="Hackathon">Hackathon</option>
			</select>
		</div>

		<div>
			<label for="cohort" class="block text-sm font-medium text-gray-700 mb-1">
				Cohort
			</label>
			<select
				id="cohort"
				bind:value={cohortId}
				class="w-full border rounded px-3 py-2"
			>
				<option value="">No cohort (open event)</option>
				{#each data.cohorts as cohort (cohort.id)}
					<option value={cohort.id}>{cohort.name}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-center gap-2">
			<input
				type="checkbox"
				id="isPublic"
				bind:checked={isPublic}
				class="rounded"
			/>
			<label for="isPublic" class="text-sm font-medium text-gray-700">
				Public event (visible on check-in page)
			</label>
		</div>

		{#if isPublic}
			<div>
				<label for="checkInCode" class="block text-sm font-medium text-gray-700 mb-1">
					Check-in Code
				</label>
				<input
					type="number"
					id="checkInCode"
					bind:value={checkInCode}
					class="w-full border rounded px-3 py-2"
					placeholder="e.g. 1234"
					min="0"
					max="9999"
				/>
				<p class="text-sm text-gray-500 mt-1">4-digit code for external attendees</p>
			</div>
		{/if}

		<div>
			<label for="surveyUrl" class="block text-sm font-medium text-gray-700 mb-1">
				Survey URL
			</label>
			<input
				type="url"
				id="surveyUrl"
				bind:value={surveyUrl}
				class="w-full border rounded px-3 py-2"
				placeholder="https://..."
			/>
		</div>

		<div class="flex gap-3 pt-4">
			<button
				type="submit"
				disabled={submitting}
				class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
			>
				{submitting ? 'Saving...' : 'Save Changes'}
			</button>
			<a
				href={resolve('/admin/events')}
				class="px-4 py-2 border rounded hover:bg-gray-50"
			>
				Cancel
			</a>
			<button
				type="button"
				onclick={() => showDeleteConfirm = true}
				disabled={submitting}
				class="ml-auto text-red-600 hover:text-red-800 disabled:opacity-50"
			>
				Delete
			</button>
		</div>
	</form>
</div>

{#if showDeleteConfirm}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-lg p-6 max-w-md w-full">
			<h2 class="text-lg font-bold mb-2">Delete Event?</h2>
			<p class="text-gray-600 mb-4">
				Are you sure you want to delete "{data.event.name}"? This will also remove all attendance records linked to this event.
			</p>
			<div class="flex gap-3 justify-end">
				<button
					onclick={() => showDeleteConfirm = false}
					disabled={submitting}
					class="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					onclick={handleDelete}
					disabled={submitting}
					class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
				>
					{submitting ? 'Deleting...' : 'Delete'}
				</button>
			</div>
		</div>
	</div>
{/if}
