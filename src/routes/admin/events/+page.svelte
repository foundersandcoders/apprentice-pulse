<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { EVENT_TYPES, type EventType } from '$lib/types/event';
	import CalendarPicker from '$lib/components/CalendarPicker.svelte';

	let { data } = $props();

	// Page mode: list view or creation forms
	let mode = $state<'list' | 'single' | 'series'>('list');

	// Single event form state
	let name = $state('');
	let dateTime = $state('');
	let cohortId = $state('');
	let eventType = $state<EventType>(EVENT_TYPES[0]);
	let isPublic = $state(false);
	let checkInCode = $state<number | undefined>(undefined);
	// svelte-ignore state_referenced_locally
	let surveyUrl = $state(data.defaultSurveyUrl);
	let error = $state('');
	let submitting = $state(false);

	// Series form state
	let seriesName = $state('');
	let seriesTime = $state('10:00');
	let seriesCohortId = $state('');
	let seriesEventType = $state<EventType>(EVENT_TYPES[0]);
	let seriesIsPublic = $state(false);
	// svelte-ignore state_referenced_locally
	let seriesSurveyUrl = $state(data.defaultSurveyUrl);
	let selectedDates = $state<Date[]>([]);
	let seriesError = $state('');
	let seriesSubmitting = $state(false);
	let seriesProgress = $state<{ created: number; total: number } | null>(null);

	// Expandable row state
	interface RosterEntry {
		id: string;
		name: string;
		email: string;
		type: 'apprentice' | 'external';
		checkedIn: boolean;
		checkinTime?: string;
	}
	let expandedEventId = $state<string | null>(null);
	let rosterData = $state<RosterEntry[]>([]);
	let rosterLoading = $state(false);

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
		const cohort = data.cohorts.find(c => c.id === cohortId);
		return cohort?.name ?? null;
	}

	function getCohortApprenticeCount(cohortId: string | undefined): number | null {
		if (!cohortId) return null;
		const cohort = data.cohorts.find(c => c.id === cohortId);
		return cohort?.apprenticeCount ?? null;
	}

	async function toggleEventRow(eventId: string) {
		if (expandedEventId === eventId) {
			// Collapse
			expandedEventId = null;
			rosterData = [];
			return;
		}

		// Expand and load roster
		expandedEventId = eventId;
		rosterLoading = true;
		rosterData = [];

		try {
			const response = await fetch(`/api/events/${eventId}/roster`);
			const result = await response.json();

			if (result.success) {
				rosterData = result.roster;
			}
		}
		catch {
			console.error('Failed to load roster');
		}
		finally {
			rosterLoading = false;
		}
	}

	function formatCheckinTime(time: string | undefined): string {
		if (!time) return '';
		const date = new Date(time);
		return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	}

	function handleCohortFilter(event: Event) {
		const select = event.target as HTMLSelectElement;
		const cohortId = select.value;
		const baseUrl = resolve('/admin/events');
		if (cohortId) {
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- query params require string concat
			goto(baseUrl + '?cohort=' + cohortId);
		}
		else {
			goto(baseUrl);
		}
	}

	function resetSingleForm() {
		name = '';
		dateTime = '';
		cohortId = '';
		eventType = EVENT_TYPES[0];
		isPublic = false;
		checkInCode = undefined;
		surveyUrl = data.defaultSurveyUrl;
		error = '';
	}

	function resetSeriesForm() {
		seriesName = '';
		seriesTime = '10:00';
		seriesCohortId = '';
		seriesEventType = EVENT_TYPES[0];
		seriesIsPublic = false;
		seriesSurveyUrl = data.defaultSurveyUrl;
		selectedDates = [];
		seriesError = '';
		seriesProgress = null;
	}

	function cancelForm() {
		mode = 'list';
		resetSingleForm();
		resetSeriesForm();
	}

	// Submit single event
	async function handleSingleSubmit(e: Event) {
		e.preventDefault();
		error = '';
		submitting = true;

		try {
			const response = await fetch('/api/events', {
				method: 'POST',
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
				error = result.error || 'Failed to create event';
				return;
			}

			// Reload page to show new event
			window.location.reload();
		}
		catch {
			error = 'Failed to create event';
		}
		finally {
			submitting = false;
		}
	}

	// Check if two dates are the same day
	function isSameDay(d1: Date, d2: Date): boolean {
		return d1.getFullYear() === d2.getFullYear()
			&& d1.getMonth() === d2.getMonth()
			&& d1.getDate() === d2.getDate();
	}

	// Handle date toggle for series
	function handleDateToggle(date: Date) {
		const index = selectedDates.findIndex(d => isSameDay(d, date));

		if (index >= 0) {
			selectedDates = selectedDates.filter((_, i) => i !== index);
		}
		else {
			selectedDates = [...selectedDates, date].sort((a, b) => a.getTime() - b.getTime());
		}
	}

	// Remove a selected date
	function removeDate(date: Date) {
		selectedDates = selectedDates.filter(d => !isSameDay(d, date));
	}

	// Format date for preview
	function formatPreviewDate(date: Date): string {
		return date.toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
		});
	}

	/* eslint-disable svelte/prefer-svelte-reactivity -- pure function for computation */
	// Combine date and time
	function combineDateAndTime(date: Date, timeStr: string): string {
		const [hours, minutes] = timeStr.split(':').map(Number);
		const combined = new Date(date);
		combined.setHours(hours, minutes, 0, 0);
		return combined.toISOString();
	}
	/* eslint-enable svelte/prefer-svelte-reactivity */

	// Submit series
	async function handleSeriesSubmit(e: Event) {
		e.preventDefault();
		seriesError = '';

		if (selectedDates.length === 0) {
			seriesError = 'Please select at least one date';
			return;
		}

		seriesSubmitting = true;
		seriesProgress = { created: 0, total: selectedDates.length };

		const results: { success: boolean; date: Date; error?: string }[] = [];

		for (let i = 0; i < selectedDates.length; i++) {
			const date = selectedDates[i];
			const eventName = selectedDates.length > 1
				? `${seriesName} ${i + 1}`
				: seriesName;

			try {
				const response = await fetch('/api/events', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						name: eventName,
						dateTime: combineDateAndTime(date, seriesTime),
						cohortId: seriesCohortId || undefined,
						eventType: seriesEventType,
						isPublic: seriesIsPublic,
						surveyUrl: seriesSurveyUrl || undefined,
					}),
				});

				const result = await response.json();

				if (result.success) {
					results.push({ success: true, date });
					seriesProgress = { created: i + 1, total: selectedDates.length };
				}
				else {
					results.push({ success: false, date, error: result.error });
				}
			}
			catch {
				results.push({ success: false, date, error: 'Network error' });
			}
		}

		const successful = results.filter(r => r.success).length;
		const failed = results.filter(r => !r.success);

		if (failed.length === 0) {
			// All succeeded - reload page
			window.location.reload();
		}
		else if (successful > 0) {
			seriesError = `Created ${successful} events. ${failed.length} failed.`;
		}
		else {
			seriesError = 'Failed to create events';
		}

		seriesSubmitting = false;
	}
</script>

<div class="p-6 max-w-4xl mx-auto">
	<header class="mb-6">
		{#if mode === 'list'}
			<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
			<h1 class="text-2xl font-bold mt-2">Events</h1>
		{:else}
			<button onclick={cancelForm} class="text-blue-600 hover:underline text-sm">← Cancel</button>
			<h1 class="text-2xl font-bold mt-2">
				{mode === 'single' ? 'Add Event' : 'Add Event Series'}
			</h1>
		{/if}
	</header>

	{#if mode === 'list'}
		<!-- List view -->
		<div class="mb-4 flex items-center justify-between flex-wrap gap-4">
			<div>
				<label for="cohort-filter" class="text-sm text-gray-600 mr-2">Filter by cohort:</label>
				<select
					id="cohort-filter"
					class="border rounded px-3 py-1.5"
					value={data.selectedCohortId ?? ''}
					onchange={handleCohortFilter}
				>
					<option value="">All cohorts</option>
					{#each data.cohorts as cohort (cohort.id)}
						<option value={cohort.name}>{cohort.name}</option>
					{/each}
				</select>
			</div>
			<div class="flex gap-2">
				<button
					onclick={() => { mode = 'single'; }}
					class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
				>
					+ Add Event
				</button>
				<button
					onclick={() => { mode = 'series'; }}
					class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
				>
					+ Add Series
				</button>
			</div>
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
							<th class="p-3 border-b font-semibold">Attendance</th>
							<th class="p-3 border-b font-semibold">Public</th>
							<th class="p-3 border-b font-semibold w-16"></th>
						</tr>
					</thead>
					<tbody>
						{#each data.events as event (event.id)}
							{@const expectedAttendance = getCohortApprenticeCount(event.cohortId)}
							{@const isExpanded = expandedEventId === event.id}
							<tr
								class="border-b hover:bg-gray-50 cursor-pointer"
								class:bg-blue-50={isExpanded}
								onclick={() => toggleEventRow(event.id)}
							>
								<td class="p-3">
									<span class="inline-flex items-center gap-2">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="h-4 w-4 text-gray-400 transition-transform"
											class:rotate-90={isExpanded}
											viewBox="0 0 20 20"
											fill="currentColor"
										>
											<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
										</svg>
										{event.name || '(Untitled)'}
									</span>
								</td>
								<td class="p-3">{formatDate(event.dateTime)}</td>
								<td class="p-3">{event.eventType || '—'}</td>
								<td class="p-3">
									{#if event.cohortId}
										<span class="text-sm">{getCohortName(event.cohortId) || event.cohortId}</span>
									{:else}
										<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Open</span>
									{/if}
								</td>
								<td class="p-3">
									{#if expectedAttendance !== null}
										<span class="font-mono text-sm">{event.attendanceCount ?? 0}/{expectedAttendance}</span>
									{:else}
										<span class="text-gray-400">{event.attendanceCount ?? 0}</span>
									{/if}
								</td>
								<td class="p-3">
									{#if event.isPublic}
										<span class="text-green-600">Yes</span>
									{:else}
										<span class="text-gray-400">No</span>
									{/if}
								</td>
								<td class="p-3">
									<a
										href={resolve(`/admin/events/${event.id}`)}
										class="text-gray-500 hover:text-blue-600"
										title="Edit event"
										onclick={e => e.stopPropagation()}
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
											<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
										</svg>
									</a>
								</td>
							</tr>
							{#if isExpanded}
								<tr class="bg-gray-50">
									<td colspan="7" class="p-4">
										{#if rosterLoading}
											<div class="text-gray-500 text-sm">Loading roster...</div>
										{:else if rosterData.length === 0}
											<div class="text-gray-500 text-sm">No attendees</div>
										{:else}
											<table class="text-sm max-h-64 overflow-y-auto ml-4">
												<tbody>
													{#each rosterData as person (person.id)}
														<tr>
															<td class="py-1 pl-4 pr-4 font-medium">{person.name}</td>
															<td class="py-1">
																{#if person.checkedIn}
																	<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
																		Checked in{#if person.checkinTime} at {formatCheckinTime(person.checkinTime)}{/if}
																	</span>
																{:else}
																	<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs">Not checked in</span>
																{/if}
															</td>
														</tr>
													{/each}
												</tbody>
											</table>
										{/if}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-gray-400 text-sm mt-4">Showing {data.events.length} event(s)</p>
		{/if}

	{:else if mode === 'single'}
		<!-- Single event form -->
		<div class="max-w-2xl">
			{#if error}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					{error}
				</div>
			{/if}

			<form onsubmit={handleSingleSubmit} class="space-y-4">
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
						placeholder="e.g. Week 1 Monday"
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
						{#each EVENT_TYPES as type (type)}
							<option value={type}>{type}</option>
						{/each}
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
						{submitting ? 'Creating...' : 'Create Event'}
					</button>
					<button
						type="button"
						onclick={cancelForm}
						class="px-4 py-2 border rounded hover:bg-gray-50"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>

	{:else if mode === 'series'}
		<!-- Series event form -->
		<div class="max-w-4xl">
			{#if seriesError}
				<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
					{seriesError}
				</div>
			{/if}

			<form onsubmit={handleSeriesSubmit} class="space-y-6">
				<div class="grid md:grid-cols-2 gap-6">
					<!-- Left column: form fields -->
					<div class="space-y-4">
						<div>
							<label for="seriesName" class="block text-sm font-medium text-gray-700 mb-1">
								Base Name <span class="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="seriesName"
								bind:value={seriesName}
								required
								class="w-full border rounded px-3 py-2"
								placeholder="e.g. AI Workshop"
							/>
							<p class="text-sm text-gray-500 mt-1">Numbers will be appended: "AI Workshop 1", "AI Workshop 2"...</p>
						</div>

						<div>
							<label for="seriesTime" class="block text-sm font-medium text-gray-700 mb-1">
								Time <span class="text-red-500">*</span>
							</label>
							<input
								type="time"
								id="seriesTime"
								bind:value={seriesTime}
								required
								class="w-full border rounded px-3 py-2"
							/>
							<p class="text-sm text-gray-500 mt-1">Same time for all events</p>
						</div>

						<div>
							<label for="seriesEventType" class="block text-sm font-medium text-gray-700 mb-1">
								Event Type <span class="text-red-500">*</span>
							</label>
							<select
								id="seriesEventType"
								bind:value={seriesEventType}
								required
								class="w-full border rounded px-3 py-2"
							>
								{#each EVENT_TYPES as type (type)}
									<option value={type}>{type}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="seriesCohort" class="block text-sm font-medium text-gray-700 mb-1">
								Cohort
							</label>
							<select
								id="seriesCohort"
								bind:value={seriesCohortId}
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
								id="seriesIsPublic"
								bind:checked={seriesIsPublic}
								class="rounded"
							/>
							<label for="seriesIsPublic" class="text-sm font-medium text-gray-700">
								Public events
							</label>
						</div>

						<div>
							<label for="seriesSurveyUrl" class="block text-sm font-medium text-gray-700 mb-1">
								Survey URL
							</label>
							<input
								type="url"
								id="seriesSurveyUrl"
								bind:value={seriesSurveyUrl}
								class="w-full border rounded px-3 py-2"
								placeholder="https://..."
							/>
						</div>
					</div>

					<!-- Right column: calendar -->
					<div>
						<p class="block text-sm font-medium text-gray-700 mb-2">
							Select Dates <span class="text-red-500">*</span>
						</p>
						<CalendarPicker
							{selectedDates}
							onDateToggle={handleDateToggle}
						/>
					</div>
				</div>

				<!-- Selected dates preview -->
				{#if selectedDates.length > 0}
					<div class="border-t pt-4">
						<p class="text-sm font-medium text-gray-700 mb-2">
							Selected: {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''}
						</p>
						<ul class="space-y-1">
							{#each selectedDates as date, i (date.toISOString())}
								<li class="flex items-center gap-2 text-sm">
									<span class="text-gray-600">{formatPreviewDate(date)}</span>
									<span class="text-gray-400">→</span>
									<span class="font-medium">"{seriesName || 'Event'} {selectedDates.length > 1 ? i + 1 : ''}"</span>
									<button
										type="button"
										onclick={() => removeDate(date)}
										class="text-red-500 hover:text-red-700 ml-auto"
										aria-label="Remove date"
									>
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
										</svg>
									</button>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Progress indicator -->
				{#if seriesProgress}
					<div class="bg-blue-50 border border-blue-200 px-4 py-3 rounded">
						Creating events... {seriesProgress.created} / {seriesProgress.total}
					</div>
				{/if}

				<div class="flex gap-3 pt-4">
					<button
						type="submit"
						disabled={seriesSubmitting || selectedDates.length === 0}
						class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
					>
						{#if seriesSubmitting}
							Creating...
						{:else}
							Create {selectedDates.length} Event{selectedDates.length !== 1 ? 's' : ''}
						{/if}
					</button>
					<button
						type="button"
						onclick={cancelForm}
						class="px-4 py-2 border rounded hover:bg-gray-50"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}
</div>
