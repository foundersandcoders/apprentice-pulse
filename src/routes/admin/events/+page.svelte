<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { EVENT_TYPES, EVENT_TYPE_COLORS, type EventType } from '$lib/types/event';
	import { ATTENDANCE_STATUSES } from '$lib/types/attendance';
	import { Calendar, DayGrid, Interaction } from '@event-calendar/core';
	import '@event-calendar/core/index.css';

	let { data } = $props();

	// Sorting state
	type SortColumn = 'name' | 'dateTime' | 'eventType' | 'cohort' | 'attendance';
	type SortDirection = 'asc' | 'desc';
	let sortColumn = $state<SortColumn>('dateTime');
	let sortDirection = $state<SortDirection>('desc'); // Newest first by default
	let hidePastEvents = $state(false);

	// Local reactive copy of events for updating attendance counts
	let events = $state(data.events);

	// Filtered and sorted events
	let sortedEvents = $derived.by(() => {
		const now = new Date();
		const filtered = hidePastEvents
			? events.filter(e => new Date(e.dateTime) >= now)
			: events;

		return [...filtered].sort((a, b) => {
			let comparison = 0;

			switch (sortColumn) {
				case 'name':
					comparison = (a.name || '').localeCompare(b.name || '');
					break;
				case 'dateTime':
					comparison = new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
					break;
				case 'eventType':
					comparison = (a.eventType || '').localeCompare(b.eventType || '');
					break;
				case 'cohort': {
					const cohortA = getCohortName(a.cohortId) || '';
					const cohortB = getCohortName(b.cohortId) || '';
					comparison = cohortA.localeCompare(cohortB);
					break;
				}
				case 'attendance':
					comparison = (a.attendanceCount ?? 0) - (b.attendanceCount ?? 0);
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
			sortDirection = column === 'dateTime' ? 'desc' : 'asc'; // Default desc for date, asc for others
		}
	}

	function isPastEvent(dateTime: string): boolean {
		return new Date(dateTime) < new Date();
	}

	// Calendar plugins
	const calendarPlugins = [DayGrid, Interaction];

	// Helper to format date as YYYY-MM-DD
	function formatDateKey(date: Date): string {
		return date.toISOString().slice(0, 10);
	}

	// Check if two dates are the same day
	function isSameDay(d1: Date, d2: Date): boolean {
		return d1.getFullYear() === d2.getFullYear()
			&& d1.getMonth() === d2.getMonth()
			&& d1.getDate() === d2.getDate();
	}

	// Selected dates for series creation (declared early for use in calendarEvents)
	let selectedDates = $state<Date[]>([]);

	// Toggle date selection for series creation
	function handleDateClick(info: { date: Date }) {
		const clickedDate = info.date;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- Event handler needs fresh Date
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		// Don't allow selecting past dates
		if (clickedDate < today) return;

		const index = selectedDates.findIndex(d => isSameDay(d, clickedDate));
		if (index >= 0) {
			selectedDates = selectedDates.filter((_, i) => i !== index);
		}
		else {
			selectedDates = [...selectedDates, clickedDate].sort((a, b) => a.getTime() - b.getTime());
		}
	}

	// Build calendar events: real events + selected date markers
	let calendarEvents = $derived.by(() => {
		// Real events from data
		const realEvents = events.map((event) => {
			const start = new Date(event.dateTime);
			const end = new Date(start.getTime() + 60 * 60 * 1000); // +1 hour

			return {
				id: event.id,
				title: event.name || '(Untitled)',
				start: start.toISOString().slice(0, 16).replace('T', ' '),
				end: end.toISOString().slice(0, 16).replace('T', ' '),
				color: EVENT_TYPE_COLORS[event.eventType]?.main || '#3b82f6',
			};
		});

		// Selected dates as background events (for series creation)
		const selectedMarkers = selectedDates.map((date, i) => ({
			id: `selected-${i}`,
			start: formatDateKey(date),
			end: formatDateKey(date),
			display: 'background' as const,
			color: '#22c55e',
		}));

		return [...realEvents, ...selectedMarkers];
	});

	// Calendar options
	let calendarOptions = $derived({
		view: 'dayGridMonth',
		headerToolbar: {
			start: 'prev,next today',
			center: 'title',
			end: '',
		},
		buttonText: {
			today: 'Today',
		},
		events: calendarEvents,
		eventClick: (info: { event: { id: string } }) => {
			// If clicking a real event (not a selection marker), could navigate to it
			if (!info.event.id.startsWith('selected-')) {
				// Could add navigation here if desired
			}
		},
		dateClick: handleDateClick,
		dayMaxEvents: true,
		nowIndicator: true,
		selectable: false, // We handle selection via dateClick
	});

	// Page mode: list view or series creation form
	let mode = $state<'list' | 'series'>('list');

	// Inline event creation state
	let isAddingEvent = $state(false);
	// svelte-ignore state_referenced_locally
	let newEvent = $state({
		name: '',
		dateTime: '',
		cohortId: '',
		eventType: EVENT_TYPES[0] as EventType,
		isPublic: false,
		surveyUrl: data.defaultSurveyUrl,
	});
	let addEventError = $state('');
	let addEventSubmitting = $state(false);

	// Series form state
	let seriesName = $state('');
	let seriesTime = $state('10:00');
	let seriesCohortId = $state('');
	let seriesEventType = $state<EventType>(EVENT_TYPES[0]);
	let seriesIsPublic = $state(false);
	// svelte-ignore state_referenced_locally
	let seriesSurveyUrl = $state(data.defaultSurveyUrl);
	let seriesError = $state('');
	let seriesSubmitting = $state(false);
	let seriesProgress = $state<{ created: number; total: number } | null>(null);

	// Expandable row state
	type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';
	interface RosterEntry {
		id: string; // Apprentice ID or external attendance ID
		attendanceId?: string; // Attendance record ID (undefined if not checked in yet)
		name: string;
		email: string;
		type: 'apprentice' | 'external';
		status: AttendanceStatus;
		checkinTime?: string;
	}

	const statusStyles: Record<AttendanceStatus, string> = {
		Present: 'bg-green-100 text-green-700',
		Absent: 'bg-red-100 text-red-700',
		Late: 'bg-yellow-100 text-yellow-700',
		Excused: 'bg-blue-100 text-blue-700',
	};
	let expandedEventId = $state<string | null>(null);
	let expandedEventDateTime = $state<string | null>(null);
	let rosterData = $state<RosterEntry[]>([]);
	let rosterLoading = $state(false);

	// Status editing state
	let editingPersonId = $state<string | null>(null);
	let editingStatus = $state<AttendanceStatus>('Present');
	let editingCheckinTime = $state<string>('');
	let statusUpdateLoading = $state(false);

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

	async function toggleEventRow(eventId: string, eventDateTime: string) {
		if (expandedEventId === eventId) {
			// Collapse
			expandedEventId = null;
			expandedEventDateTime = null;
			rosterData = [];
			editingPersonId = null;
			return;
		}

		// Expand and load roster
		expandedEventId = eventId;
		expandedEventDateTime = eventDateTime;
		rosterLoading = true;
		rosterData = [];
		editingPersonId = null;

		try {
			const response = await fetch(`/api/events/${eventId}/roster`);
			const result = await response.json();

			if (result.success) {
				rosterData = result.roster;

				// Recalculate attendance count based on actual Present/Late statuses
				const actualAttendance = rosterData.filter(
					p => p.status === 'Present' || p.status === 'Late',
				).length;

				events = events.map(e =>
					e.id === eventId ? { ...e, attendanceCount: actualAttendance } : e,
				);
			}
		}
		catch {
			console.error('Failed to load roster');
		}
		finally {
			rosterLoading = false;
		}
	}

	function startEditingStatus(person: RosterEntry) {
		editingPersonId = person.id;
		editingStatus = person.status;
		// Default check-in time: use existing or event start time
		if (person.checkinTime) {
			editingCheckinTime = person.checkinTime.slice(0, 16); // Format for datetime-local
		}
		else if (expandedEventDateTime) {
			editingCheckinTime = expandedEventDateTime.slice(0, 16);
		}
		else {
			editingCheckinTime = new Date().toISOString().slice(0, 16);
		}
	}

	function cancelEditingStatus() {
		editingPersonId = null;
	}

	async function saveStatus(person: RosterEntry) {
		// No change - just close editor
		if (person.status === editingStatus) {
			editingPersonId = null;
			return;
		}

		const hasExistingRecord = !!person.attendanceId;
		const needsRecord = editingStatus !== 'Absent'; // Excused still needs a record for tracking
		const countsAsAttendance = editingStatus === 'Present' || editingStatus === 'Late';

		// Case: No record and changing to Absent - just update local UI
		if (!hasExistingRecord && !needsRecord) {
			rosterData = rosterData.map(p =>
				p.id === person.id ? { ...p, status: editingStatus, checkinTime: undefined } : p,
			);
			editingPersonId = null;
			return;
		}

		statusUpdateLoading = true;

		try {
			const checkinTime = (editingStatus === 'Present' || editingStatus === 'Late')
				? new Date(editingCheckinTime).toISOString()
				: undefined;

			let result;

			if (hasExistingRecord) {
				// Update existing record
				const response = await fetch(`/api/attendance/${person.attendanceId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: editingStatus, checkinTime }),
				});
				result = await response.json();
			}
			else {
				// Create new record (only reaches here if needsRecord is true)
				const response = await fetch('/api/attendance', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						eventId: expandedEventId,
						apprenticeId: person.id,
						status: editingStatus,
						checkinTime,
					}),
				});
				result = await response.json();
			}

			if (result.success) {
				// Update roster
				rosterData = rosterData.map(p =>
					p.id === person.id
						? { ...p, attendanceId: result.attendance?.id ?? p.attendanceId, status: editingStatus, checkinTime }
						: p,
				);

				// Update event attendance count based on state change
				if (expandedEventId) {
					const prevCountsAsAttendance = person.status === 'Present' || person.status === 'Late';
					const countDelta = (countsAsAttendance ? 1 : 0) - (prevCountsAsAttendance ? 1 : 0);

					if (countDelta !== 0) {
						events = events.map(e =>
							e.id === expandedEventId
								? { ...e, attendanceCount: (e.attendanceCount ?? 0) + countDelta }
								: e,
						);
					}
				}

				editingPersonId = null;
			}
			else {
				alert(result.error || 'Failed to update status');
			}
		}
		catch {
			alert('Failed to update status');
		}
		finally {
			statusUpdateLoading = false;
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

	function resetNewEventForm() {
		newEvent = {
			name: '',
			dateTime: '',
			cohortId: '',
			eventType: EVENT_TYPES[0],
			isPublic: false,
			surveyUrl: data.defaultSurveyUrl,
		};
		addEventError = '';
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
		isAddingEvent = false;
		resetNewEventForm();
		resetSeriesForm();
	}

	function cancelAddEvent() {
		isAddingEvent = false;
		resetNewEventForm();
	}

	// Delete event
	async function handleDeleteEvent(eventId: string, eventName: string) {
		if (!confirm(`Delete "${eventName || 'Untitled'}"? This cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch(`/api/events/${eventId}`, {
				method: 'DELETE',
			});

			const result = await response.json();

			if (!result.success) {
				alert(result.error || 'Failed to delete event');
				return;
			}

			// Reload page to reflect deletion
			window.location.reload();
		}
		catch {
			alert('Failed to delete event');
		}
	}

	// Submit inline event
	async function handleAddEventSubmit() {
		addEventError = '';
		addEventSubmitting = true;

		try {
			const response = await fetch('/api/events', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newEvent.name,
					dateTime: new Date(newEvent.dateTime).toISOString(),
					cohortId: newEvent.cohortId || undefined,
					eventType: newEvent.eventType,
					isPublic: newEvent.isPublic,
					surveyUrl: newEvent.surveyUrl || undefined,
				}),
			});

			const result = await response.json();

			if (!result.success) {
				addEventError = result.error || 'Failed to create event';
				return;
			}

			// Reload page to show new event
			window.location.reload();
		}
		catch {
			addEventError = 'Failed to create event';
		}
		finally {
			addEventSubmitting = false;
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
			<h1 class="text-2xl font-bold mt-2">Add Event Series</h1>
		{/if}
	</header>

	{#if mode === 'list'}
		<!-- List view -->
		<div class="mb-4 flex items-center justify-between flex-wrap gap-4">
			<div class="flex items-center gap-6">
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
				<label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
					<input
						type="checkbox"
						bind:checked={hidePastEvents}
						class="rounded"
					/>
					Hide past events
				</label>
			</div>
			<div class="flex gap-2">
				<button
					onclick={() => { isAddingEvent = true; }}
					class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
					disabled={isAddingEvent}
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

		{#if events.length === 0}
			<p class="text-gray-500">No events found.</p>
		{:else}
			<div class="overflow-x-auto">
				<table class="w-full border-collapse">
					<thead>
						<tr class="bg-gray-100 text-left">
							<th class="p-3 border-b font-semibold">
								<button
									onclick={() => toggleSort('name')}
									class="inline-flex items-center gap-1 hover:text-blue-600"
								>
									Name
									{#if sortColumn === 'name'}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											{#if sortDirection === 'asc'}
												<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
											{:else}
												<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
											{/if}
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clip-rule="evenodd" />
										</svg>
									{/if}
								</button>
							</th>
							<th class="p-3 border-b font-semibold">
								<button
									onclick={() => toggleSort('dateTime')}
									class="inline-flex items-center gap-1 hover:text-blue-600"
								>
									Date/Time
									{#if sortColumn === 'dateTime'}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											{#if sortDirection === 'asc'}
												<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
											{:else}
												<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
											{/if}
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clip-rule="evenodd" />
										</svg>
									{/if}
								</button>
							</th>
							<th class="p-3 border-b font-semibold">
								<button
									onclick={() => toggleSort('eventType')}
									class="inline-flex items-center gap-1 hover:text-blue-600"
								>
									Type
									{#if sortColumn === 'eventType'}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											{#if sortDirection === 'asc'}
												<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
											{:else}
												<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
											{/if}
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clip-rule="evenodd" />
										</svg>
									{/if}
								</button>
							</th>
							<th class="p-3 border-b font-semibold">
								<button
									onclick={() => toggleSort('cohort')}
									class="inline-flex items-center gap-1 hover:text-blue-600"
								>
									Cohort
									{#if sortColumn === 'cohort'}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											{#if sortDirection === 'asc'}
												<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
											{:else}
												<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
											{/if}
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clip-rule="evenodd" />
										</svg>
									{/if}
								</button>
							</th>
							<th class="p-3 border-b font-semibold">
								<button
									onclick={() => toggleSort('attendance')}
									class="inline-flex items-center gap-1 hover:text-blue-600"
								>
									Attendance
									{#if sortColumn === 'attendance'}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
											{#if sortDirection === 'asc'}
												<path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" />
											{:else}
												<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
											{/if}
										</svg>
									{:else}
										<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-gray-300" viewBox="0 0 20 20" fill="currentColor">
											<path fill-rule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clip-rule="evenodd" />
										</svg>
									{/if}
								</button>
							</th>
							<th class="p-3 border-b font-semibold">Public</th>
							<th class="p-3 border-b font-semibold">Survey</th>
							<th class="p-3 border-b font-semibold w-16"></th>
						</tr>
					</thead>
					<tbody>
						{#if isAddingEvent}
							<!-- Inline event creation row -->
							<tr class="border-b bg-blue-50">
								<td class="p-2">
									<input
										type="text"
										bind:value={newEvent.name}
										placeholder="Event name"
										class="w-full border rounded px-2 py-1 text-sm"
										required
									/>
								</td>
								<td class="p-2">
									<input
										type="datetime-local"
										bind:value={newEvent.dateTime}
										class="w-full border rounded px-2 py-1 text-sm"
										required
									/>
								</td>
								<td class="p-2">
									<select
										bind:value={newEvent.eventType}
										class="w-full border rounded px-2 py-1 text-sm"
									>
										{#each EVENT_TYPES as type (type)}
											<option value={type}>{type}</option>
										{/each}
									</select>
								</td>
								<td class="p-2">
									<select
										bind:value={newEvent.cohortId}
										class="w-full border rounded px-2 py-1 text-sm"
									>
										<option value="">Open</option>
										{#each data.cohorts as cohort (cohort.id)}
											<option value={cohort.id}>{cohort.name}</option>
										{/each}
									</select>
								</td>
								<td class="p-2 text-center text-gray-400">—</td>
								<td class="p-2 text-center">
									<input
										type="checkbox"
										bind:checked={newEvent.isPublic}
										class="rounded"
									/>
								</td>
								<td class="p-2">
									<input
										type="url"
										bind:value={newEvent.surveyUrl}
										placeholder="Survey URL"
										class="w-full border rounded px-2 py-1 text-sm"
									/>
								</td>
								<td class="p-2">
									<div class="flex gap-1">
										<button
											onclick={handleAddEventSubmit}
											disabled={addEventSubmitting || !newEvent.name || !newEvent.dateTime}
											class="text-green-600 hover:text-green-800 disabled:opacity-50"
											title="Save"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
											</svg>
										</button>
										<button
											onclick={cancelAddEvent}
											class="text-red-600 hover:text-red-800"
											title="Cancel"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
							{#if addEventError}
								<tr class="bg-red-50">
									<td colspan="8" class="p-2 text-red-600 text-sm">{addEventError}</td>
								</tr>
							{/if}
						{/if}
						{#each sortedEvents as event (event.id)}
							{@const expectedAttendance = getCohortApprenticeCount(event.cohortId)}
							{@const isExpanded = expandedEventId === event.id}
							{@const hasRoster = (event.attendanceCount ?? 0) > 0 || expectedAttendance !== null}
							{@const isPast = isPastEvent(event.dateTime)}
							<tr
								class="border-b hover:bg-gray-100"
								class:cursor-pointer={hasRoster}
								class:bg-blue-50={isExpanded}
								class:bg-stone-100={isPast && !isExpanded}
								onclick={() => hasRoster && toggleEventRow(event.id, event.dateTime)}
							>
								<td class="p-3">
									<span class="inline-flex items-center gap-2">
										{#if hasRoster}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-4 w-4 text-gray-400 transition-transform"
												class:rotate-90={isExpanded}
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
											</svg>
										{:else}
											<span class="w-4"></span>
										{/if}
										{event.name || '(Untitled)'}
									</span>
								</td>
								<td class="p-3">{formatDate(event.dateTime)}</td>
								<td class="p-3">
									{#if event.eventType}
										<span class="{EVENT_TYPE_COLORS[event.eventType].tailwind} font-medium">
											{event.eventType}
										</span>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
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
									{#if event.surveyUrl}
										<a
											href={event.surveyUrl /* eslint-disable-line svelte/no-navigation-without-resolve -- external URL */}
											target="_blank"
											rel="noopener noreferrer"
											class="text-blue-600 hover:text-blue-800"
											title="Open survey"
											onclick={e => e.stopPropagation()}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
												<path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
											</svg>
										</a>
									{:else}
										<span class="text-gray-300">—</span>
									{/if}
								</td>
								<td class="p-3">
									<div class="flex gap-1">
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
										<button
											onclick={(e) => {
												e.stopPropagation();
												handleDeleteEvent(event.id, event.name);
											}}
											class="text-gray-400 hover:text-red-600"
											title="Delete event"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
							{#if isExpanded}
								<tr class="bg-gray-50">
									<td colspan="8" class="p-4">
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
															<td class="py-1 pr-2">
																{#if editingPersonId === person.id}
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
																		onclick={(e) => {
																			e.stopPropagation();
																			startEditingStatus(person);
																		}}
																		class="{statusStyles[person.status]} px-2 py-0.5 rounded text-xs hover:ring-2 hover:ring-offset-1 hover:ring-gray-300"
																		title="Click to change status"
																	>
																		{person.status}
																	</button>
																{/if}
															</td>
															<td class="py-1 pr-2">
																{#if editingPersonId === person.id && (editingStatus === 'Present' || editingStatus === 'Late')}
																	<input
																		type="datetime-local"
																		bind:value={editingCheckinTime}
																		class="border rounded px-1 py-0.5 text-xs"
																		onclick={e => e.stopPropagation()}
																	/>
																{:else if person.checkinTime}
																	<span class="text-gray-500 text-xs">{formatCheckinTime(person.checkinTime)}</span>
																{/if}
															</td>
															<td class="py-1">
																{#if editingPersonId === person.id}
																	<div class="flex gap-1">
																		<button
																			onclick={(e) => {
																				e.stopPropagation();
																				saveStatus(person);
																			}}
																			disabled={statusUpdateLoading}
																			class="text-green-600 hover:text-green-800 disabled:opacity-50"
																			title="Save"
																		>
																			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
																				<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
																			</svg>
																		</button>
																		<button
																			onclick={(e) => {
																				e.stopPropagation();
																				cancelEditingStatus();
																			}}
																			class="text-gray-500 hover:text-red-600"
																			title="Cancel"
																		>
																			<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
																				<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
																			</svg>
																		</button>
																	</div>
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
			<p class="text-gray-400 text-sm mt-4">Showing {sortedEvents.length} event(s)</p>
		{/if}

		<!-- Calendar view with date selection for series creation -->
		<div class="mt-8">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold">Calendar</h2>
				{#if selectedDates.length > 0}
					<div class="flex items-center gap-3">
						<span class="text-sm text-gray-600">
							{selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
						</span>
						<button
							onclick={() => { selectedDates = []; }}
							class="text-sm text-red-600 hover:text-red-800"
						>
							Clear
						</button>
					</div>
				{/if}
			</div>
			<!-- Legend -->
			<div class="flex flex-wrap gap-4 mb-4 text-sm">
				{#each EVENT_TYPES as type (type)}
					<div class="flex items-center gap-2">
						<span
							class="w-3 h-3 rounded-full"
							style="background-color: {EVENT_TYPE_COLORS[type].main}"
						></span>
						<span class="{EVENT_TYPE_COLORS[type].tailwind}">{type}</span>
					</div>
				{/each}
				<div class="flex items-center gap-2">
					<span class="w-3 h-3 rounded-full bg-green-500"></span>
					<span class="text-green-700">Selected for series</span>
				</div>
			</div>
			<p class="text-sm text-gray-500 mb-4">Click on future dates to select them for creating an event series.</p>
			<div class="ec-calendar-wrapper">
				<Calendar plugins={calendarPlugins} options={calendarOptions} />
			</div>
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
						<p class="text-sm text-gray-500 mb-2">Click on future dates to select/deselect them.</p>
						<div class="ec-series-calendar">
							<Calendar plugins={calendarPlugins} options={calendarOptions} />
						</div>
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

<style>
	.ec-calendar-wrapper {
		width: 100%;
		height: 600px;
	}

	.ec-series-calendar {
		width: 100%;
		height: 400px;
	}

	/* Style past dates as slightly muted */
	.ec-calendar-wrapper :global(.ec-day.ec-past),
	.ec-series-calendar :global(.ec-day.ec-past) {
		opacity: 0.6;
	}
</style>
