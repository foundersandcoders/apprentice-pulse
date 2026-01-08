<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { type EventType, type Event as AppEvent } from '$lib/types/event';
	import { ATTENDANCE_STATUSES, getStatusBadgeClass, type AttendanceStatus } from '$lib/types/attendance';
	import { Calendar, DayGrid, Interaction } from '@event-calendar/core';
	import '@event-calendar/core/index.css';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import TimePicker from '$lib/components/TimePicker.svelte';

	let { data } = $props();

	// Extract event types from server data
	const eventTypes = $derived(data.eventTypes);
	const eventTypeColors = $derived(() => {
		const colorMap: Record<string, { main: string; tailwind: string }> = {};
		eventTypes.forEach((type) => {
			colorMap[type.name] = { main: type.color, tailwind: type.tailwindClass };
		});
		return colorMap;
	});

	// Helper function to get default survey URL for an event type
	function getDefaultSurveyUrl(eventTypeName: string): string {
		if (!eventTypeName) return '';
		const type = eventTypes.find(t => t.name === eventTypeName);
		return type?.defaultSurveyUrl || data.defaultSurveyUrl;
	}

	// Sorting state
	type SortColumn = 'name' | 'dateTime' | 'eventType' | 'cohort' | 'attendance';
	type SortDirection = 'asc' | 'desc';
	let sortColumn = $state<SortColumn>('dateTime');
	let sortDirection = $state<SortDirection>('desc'); // Newest first by default
	let hidePastEvents = $state(false);

	// Local reactive copy of events for updating attendance counts
	// Syncs with server data on navigation/invalidation, allows local optimistic updates
	// eslint-disable-next-line svelte/prefer-writable-derived -- need mutable state for optimistic updates
	let events = $state<AppEvent[]>([]);
	$effect(() => {
		events = data.events;
	});

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
					const cohortA = getCohortName(a.cohortIds[0]) || '';
					const cohortB = getCohortName(b.cohortIds[0]) || '';
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

	// Helper to format date as YYYY-MM-DD (using local time, not UTC)
	function formatDateKey(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Check if two dates are the same day
	function isSameDay(d1: Date, d2: Date): boolean {
		return d1.getFullYear() === d2.getFullYear()
			&& d1.getMonth() === d2.getMonth()
			&& d1.getDate() === d2.getDate();
	}

	// Series creation mode and selected dates
	let isCreatingSeries = $state(false);
	let selectedDates = $state<Date[]>([]);

	// Toggle date selection for series creation (only when in series mode)
	function handleDateClick(info: { date: Date }) {
		// Only allow date selection when in series creation mode
		if (!isCreatingSeries) return;

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

	// Handle clicking an event in the calendar - scroll to it, select it, and expand if has attendance
	function handleCalendarEventClick(eventId: string) {
		// Find the row in the table
		const row = document.querySelector(`[data-event-id="${eventId}"]`) as HTMLElement | null;
		if (!row) return;

		// Select this event
		selectedEventId = eventId;

		// Scroll to the row
		row.scrollIntoView({ behavior: 'smooth', block: 'center' });

		// Find the event to check if it has roster data
		const event = events.find(e => e.id === eventId);
		if (!event) return;

		// Check if this event has roster (can be expanded)
		const expectedAttendance = getTotalApprenticeCount(event.cohortIds);
		const hasRoster = (event.attendanceCount ?? 0) > 0 || expectedAttendance > 0;

		// If it has roster and isn't already expanded, expand it after scroll
		if (hasRoster && expandedEventId !== eventId) {
			setTimeout(() => {
				toggleEventRow(eventId, event.dateTime);
			}, 400);
		}
	}

	// Build calendar events: real events + selected date markers
	let calendarEvents = $derived.by(() => {
		// Real events from data
		const realEvents = events.map((event) => {
			const start = new Date(event.dateTime);
			// Use endDateTime if available, otherwise default to +1 hour
			const end = event.endDateTime
				? new Date(event.endDateTime)
				: new Date(start.getTime() + 60 * 60 * 1000);

			return {
				id: event.id,
				title: event.name || '(Untitled)',
				start: start.toISOString().slice(0, 16).replace('T', ' '),
				end: end.toISOString().slice(0, 16).replace('T', ' '),
				color: eventTypeColors()[event.eventType]?.main || '#3b82f6',
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
			// If clicking a real event (not a selection marker), scroll to it in the list
			if (!info.event.id.startsWith('selected-')) {
				handleCalendarEventClick(info.event.id);
			}
		},
		dateClick: handleDateClick,
		dayMaxEvents: true,
		nowIndicator: true,
		selectable: false, // We handle selection via dateClick
	});

	// Generate a random 4-digit check-in code
	function generateCheckInCode(): number {
		return Math.floor(1000 + Math.random() * 9000);
	}

	// Helper to get today's date in YYYY-MM-DD format
	function getTodayDate(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Helper to calculate end time (+4 hours from start time)
	function calculateDefaultEndTime(startTime: string): string {
		if (!startTime) return '';
		const [hours, minutes] = startTime.split(':').map(Number);
		const endHours = (hours + 4) % 24;
		return `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
	}

	// Helper to combine date + time into ISO string
	function combineDateTime(date: string, time: string): string {
		if (!date || !time) return '';
		return new Date(`${date}T${time}`).toISOString();
	}

	// Helper to extract date from ISO string (YYYY-MM-DD)
	function extractDate(isoString: string): string {
		if (!isoString) return '';
		const date = new Date(isoString);
		if (isNaN(date.getTime())) return '';
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	// Helper to extract time from ISO string (HH:mm)
	function extractTime(isoString: string): string {
		if (!isoString) return '';
		const date = new Date(isoString);
		if (isNaN(date.getTime())) return '';
		const hours = String(date.getHours()).padStart(2, '0');
		const minutes = String(date.getMinutes()).padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	// Inline event creation state
	let isAddingEvent = $state(false);
	let tableContainer = $state<HTMLDivElement | null>(null);
	// svelte-ignore state_referenced_locally
	let newEvent = $state({
		name: '',
		date: '',
		startTime: '10:00',
		endTime: '14:00',
		cohortIds: [] as string[],
		eventType: '',
		isPublic: false,
		checkInCode: '' as string | number,
		surveyUrl: '',
	});
	let addEventError = $state('');
	let addEventSubmitting = $state(false);

	// Auto-default end time to start + 4 hours for new events
	let prevNewEventStartTime = $state('10:00');
	$effect(() => {
		if (newEvent.startTime && newEvent.startTime !== prevNewEventStartTime) {
			// Only auto-set if endTime matches the previous auto-calculated value
			if (newEvent.endTime === calculateDefaultEndTime(prevNewEventStartTime)) {
				newEvent.endTime = calculateDefaultEndTime(newEvent.startTime);
			}
			prevNewEventStartTime = newEvent.startTime;
		}
	});

	// Auto-populate survey URL when event type changes for regular event
	$effect(() => {
		if (newEvent.eventType) {
			newEvent.surveyUrl = getDefaultSurveyUrl(newEvent.eventType);
		}
	});

	// ESC key handler for canceling forms
	$effect(() => {
		function handleKeydown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				if (isAddingEvent) {
					cancelAddEvent();
				}
				else if (isCreatingSeries) {
					cancelSeriesForm();
				}
			}
		}

		if (isAddingEvent || isCreatingSeries) {
			document.addEventListener('keydown', handleKeydown);
			return () => document.removeEventListener('keydown', handleKeydown);
		}
	});

	// Auto-generate check-in code when isPublic is checked, clear when unchecked
	let prevNewEventIsPublic = $state(false);
	$effect(() => {
		if (newEvent.isPublic && !prevNewEventIsPublic) {
			newEvent.checkInCode = generateCheckInCode();
		}
		else if (!newEvent.isPublic && prevNewEventIsPublic) {
			newEvent.checkInCode = '';
		}
		prevNewEventIsPublic = newEvent.isPublic;
	});

	// Inline event editing state
	let editingEventId = $state<string | null>(null);
	let editEvent = $state({
		name: '',
		date: '',
		startTime: '',
		endTime: '',
		cohortIds: [] as string[],
		eventType: eventTypes[0]?.name || '',
		isPublic: false,
		checkInCode: '' as string | number,
		surveyUrl: '',
	});
	let editEventError = $state('');
	let editEventSubmitting = $state(false);

	// Survey URL dropdown state
	let showNewEventSurvey = $state(false);
	let showEditEventSurvey = $state(false);

	// Cohort dropdown state
	let newEventCohortDropdownOpen = $state(false);
	let editEventCohortDropdownOpen = $state(false);
	let seriesCohortDropdownOpen = $state(false);

	// Auto-default end time to start + 4 hours for edit events
	let prevEditEventStartTime = $state('');
	$effect(() => {
		if (editEvent.startTime && editEvent.startTime !== prevEditEventStartTime) {
			// Only auto-set if endTime matches the previous auto-calculated value
			if (editEvent.endTime === calculateDefaultEndTime(prevEditEventStartTime)) {
				editEvent.endTime = calculateDefaultEndTime(editEvent.startTime);
			}
			prevEditEventStartTime = editEvent.startTime;
		}
	});

	// Auto-generate check-in code when isPublic is checked (only if no existing code), clear when unchecked
	let prevEditEventIsPublic = $state(false);
	$effect(() => {
		if (editEvent.isPublic && !prevEditEventIsPublic && !editEvent.checkInCode) {
			editEvent.checkInCode = generateCheckInCode();
		}
		else if (!editEvent.isPublic && prevEditEventIsPublic) {
			editEvent.checkInCode = '';
		}
		prevEditEventIsPublic = editEvent.isPublic;
	});

	// Series form state
	let seriesName = $state('');
	let seriesTime = $state('10:00');
	let seriesEndTime = $state('11:00');
	let seriesCohortIds = $state<string[]>([]);
	let seriesEventType = $state<EventType>('');
	let seriesIsPublic = $state(false);
	let seriesCheckInCode = $state<string | number>('');
	// svelte-ignore state_referenced_locally
	let seriesSurveyUrl = $state('');

	// Auto-populate survey URL when event type changes for series
	$effect(() => {
		if (seriesEventType) {
			seriesSurveyUrl = getDefaultSurveyUrl(seriesEventType);
		}
	});
	let seriesError = $state('');
	let seriesSubmitting = $state(false);
	let seriesProgress = $state<{ created: number; total: number } | null>(null);

	// Auto-generate check-in code for series when isPublic is checked
	let prevSeriesIsPublic = $state(false);
	$effect(() => {
		if (seriesIsPublic && !prevSeriesIsPublic) {
			seriesCheckInCode = generateCheckInCode();
		}
		prevSeriesIsPublic = seriesIsPublic;
	});

	// Expandable row state
	interface RosterEntry {
		id: string; // Apprentice ID or external attendance ID
		attendanceId?: string; // Attendance record ID (undefined if not checked in yet)
		name: string;
		email: string;
		type: 'apprentice' | 'external';
		status: AttendanceStatus;
		checkinTime?: string;
	}

	let expandedEventId = $state<string | null>(null);
	let expandedEventDateTime = $state<string | null>(null);
	let rosterData = $state<RosterEntry[]>([]);
	let rosterLoading = $state(false);
	let selectedEventId = $state<string | null>(null);

	// Mark for delete state
	let markedForDelete = new SvelteSet<string>();
	let deleteInProgress = $state(false);

	// Status editing state
	let editingPersonId = $state<string | null>(null);
	let editingStatus = $state<AttendanceStatus>('Present');
	let editingCheckinTime = $state<string>('');
	let statusUpdateLoading = $state(false);

	function formatDateOnly(dateTime: string | undefined): string {
		if (!dateTime) return '—';
		const date = new Date(dateTime);
		if (isNaN(date.getTime())) return '—';
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}/${month}/${year}`;
	}

	function formatTimeOnly(dateTime: string): string {
		const date = new Date(dateTime);
		return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	}

	function getCohortName(cohortId: string | undefined): string | null {
		if (!cohortId) return null;
		const cohort = data.cohorts.find(c => c.id === cohortId);
		return cohort?.name ?? null;
	}

	function getCohortNames(cohortIds: string[]): string[] {
		return cohortIds
			.map(id => getCohortName(id))
			.filter((name): name is string => name !== null);
	}

	function getCohortApprenticeCount(cohortId: string | undefined): number | null {
		if (!cohortId) return null;
		const cohort = data.cohorts.find(c => c.id === cohortId);
		return cohort?.apprenticeCount ?? null;
	}

	function getTotalApprenticeCount(cohortIds: string[]): number {
		return cohortIds.reduce((sum, id) => {
			const count = getCohortApprenticeCount(id);
			return sum + (count ?? 0);
		}, 0);
	}

	async function toggleEventRow(eventId: string, eventDateTime: string) {
		// If same row clicked, collapse it
		if (expandedEventId === eventId) {
			expandedEventId = null;
			rosterData = [];
			return;
		}

		// Expand new row (previous one auto-collapses)
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
		const needsRecord = editingStatus !== 'Not Check-in'; // Excused still needs a record for tracking
		const countsAsAttendance = editingStatus === 'Present' || editingStatus === 'Late';

		// Case: No record and changing to Not Check-in - just update local UI
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
			date: '',
			startTime: '10:00',
			endTime: '14:00',
			cohortIds: [],
			eventType: eventTypes[0]?.name || '',
			isPublic: false,
			checkInCode: '' as string | number,
			surveyUrl: data.defaultSurveyUrl,
		};
		addEventError = '';
		newEventCohortDropdownOpen = false;
	}

	function resetSeriesForm() {
		seriesName = '';
		seriesTime = '10:00';
		seriesEndTime = '11:00';
		seriesCohortIds = [];
		seriesEventType = '';
		seriesIsPublic = false;
		seriesCheckInCode = '';
		seriesSurveyUrl = '';
		selectedDates = [];
		seriesError = '';
		seriesProgress = null;
		seriesCohortDropdownOpen = false;
	}

	function cancelSeriesForm() {
		isCreatingSeries = false;
		resetSeriesForm();
	}

	function cancelAddEvent() {
		isAddingEvent = false;
		showNewEventSurvey = false;
		resetNewEventForm();
	}

	// Toggle event marked for deletion
	function toggleMarkForDelete(eventId: string) {
		if (markedForDelete.has(eventId)) {
			markedForDelete.delete(eventId);
		}
		else {
			markedForDelete.add(eventId);
		}
	}

	// Clear all marks
	function clearMarkedForDelete() {
		markedForDelete.clear();
	}

	// Delete all marked events
	async function deleteMarkedEvents() {
		const eventIds = Array.from(markedForDelete);
		if (eventIds.length === 0) return;

		deleteInProgress = true;
		let successCount = 0;
		const errors: string[] = [];

		for (const eventId of eventIds) {
			try {
				const response = await fetch(`/api/events/${eventId}`, {
					method: 'DELETE',
				});
				const result = await response.json();

				if (result.success) {
					successCount++;
				}
				else {
					errors.push(result.error || 'Unknown error');
				}
			}
			catch {
				errors.push('Network error');
			}
		}

		deleteInProgress = false;

		if (errors.length > 0) {
			alert(`Deleted ${successCount} event(s). ${errors.length} failed.`);
		}

		// Reload to reflect changes
		window.location.reload();
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
					dateTime: combineDateTime(newEvent.date, newEvent.startTime),
					endDateTime: newEvent.endTime ? combineDateTime(newEvent.date, newEvent.endTime) : undefined,
					cohortIds: newEvent.cohortIds.length > 0 ? newEvent.cohortIds : undefined,
					eventType: newEvent.eventType,
					isPublic: newEvent.isPublic,
					checkInCode: newEvent.isPublic && newEvent.checkInCode ? Number(newEvent.checkInCode) : undefined,
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

	// Start editing an event inline
	function startEditingEvent(event: typeof events[0]) {
		editingEventId = event.id;
		editEvent = {
			name: event.name || '',
			date: extractDate(event.dateTime),
			startTime: extractTime(event.dateTime),
			endTime: event.endDateTime ? extractTime(event.endDateTime) : calculateDefaultEndTime(extractTime(event.dateTime)),
			cohortIds: [...event.cohortIds],
			eventType: event.eventType,
			isPublic: event.isPublic,
			checkInCode: event.checkInCode ?? '',
			surveyUrl: event.surveyUrl || '',
		};
		prevEditEventStartTime = editEvent.startTime;
		editEventError = '';
	}

	// Cancel editing
	function cancelEditEvent() {
		editingEventId = null;
		showEditEventSurvey = false;
		editEventError = '';
		editEventCohortDropdownOpen = false;
	}

	// Submit edited event
	async function handleEditEventSubmit() {
		if (!editingEventId) return;

		editEventError = '';
		editEventSubmitting = true;

		try {
			const response = await fetch(`/api/events/${editingEventId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editEvent.name,
					dateTime: combineDateTime(editEvent.date, editEvent.startTime),
					endDateTime: editEvent.endTime ? combineDateTime(editEvent.date, editEvent.endTime) : undefined,
					cohortIds: editEvent.cohortIds,
					eventType: editEvent.eventType,
					isPublic: editEvent.isPublic,
					checkInCode: editEvent.isPublic && editEvent.checkInCode ? Number(editEvent.checkInCode) : null,
					surveyUrl: editEvent.surveyUrl || null, // null to clear, not undefined
				}),
			});

			const result = await response.json();

			if (!result.success) {
				editEventError = result.error || 'Failed to update event';
				return;
			}

			// Update local state instead of reloading
			events = events.map(e =>
				e.id === editingEventId
					? {
							...e,
							name: editEvent.name,
							dateTime: combineDateTime(editEvent.date, editEvent.startTime),
							endDateTime: editEvent.endTime ? combineDateTime(editEvent.date, editEvent.endTime) : undefined,
							cohortIds: editEvent.cohortIds,
							eventType: editEvent.eventType,
							isPublic: editEvent.isPublic,
							checkInCode: editEvent.isPublic && editEvent.checkInCode ? Number(editEvent.checkInCode) : undefined,
							surveyUrl: editEvent.surveyUrl, // Allow clearing by using empty string
						}
					: e,
			);

			editingEventId = null;
		}
		catch {
			editEventError = 'Failed to update event';
		}
		finally {
			editEventSubmitting = false;
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
	// Combine date and time into ISO string (converts local time to UTC for storage)
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
						endDateTime: combineDateAndTime(date, seriesEndTime),
						cohortIds: seriesCohortIds.length > 0 ? seriesCohortIds : undefined,
						eventType: seriesEventType,
						isPublic: seriesIsPublic,
						checkInCode: seriesIsPublic && seriesCheckInCode ? Number(seriesCheckInCode) : undefined,
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

<div class="p-6 max-w-6xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/admin')} class="text-blue-600 hover:underline text-sm">← Back to Admin</a>
		<h1 class="text-2xl font-bold mt-2">Events</h1>
	</header>

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
			{#if isAddingEvent}
				<button
					onclick={cancelAddEvent}
					class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
				>
					Cancel
				</button>
			{:else}
				<button
					onclick={async () => {
						newEvent.date = getTodayDate();
						isAddingEvent = true;
						await tick();
						tableContainer?.scrollTo({ top: 0, behavior: 'smooth' });
					}}
					disabled={isCreatingSeries}
					class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
				>
					+ Add Event
				</button>
			{/if}
		</div>

		{#if markedForDelete.size > 0}
			<div class="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
				<span class="text-red-700 text-sm">
					{markedForDelete.size} event{markedForDelete.size !== 1 ? 's' : ''} selected
				</span>
				<button
					onclick={deleteMarkedEvents}
					disabled={deleteInProgress}
					class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
				>
					{#if deleteInProgress}
						Deleting...
					{:else}
						Delete Event{markedForDelete.size !== 1 ? 's' : ''}
					{/if}
				</button>
				<button
					onclick={clearMarkedForDelete}
					class="text-red-600 hover:text-red-800 text-sm underline"
				>
					Cancel
				</button>
			</div>
		{/if}

		{#if events.length === 0}
			<p class="text-gray-500">No events found.</p>
		{:else}
			<div bind:this={tableContainer} class="overflow-auto max-h-140 bg-white border border-gray-200 rounded-xl shadow-sm">
				<table class="w-full border-collapse">
					<thead class="sticky top-0 z-10">
						<tr class="bg-gray-50 text-left">
							<th class="p-2 border-b font-semibold">
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
							<th class="p-2 border-b font-semibold">
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
							<th class="p-2 border-b font-semibold">
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
							<th class="p-2 border-b font-semibold w-32">
								<button
									onclick={() => toggleSort('cohort')}
									class="inline-flex items-center gap-1 hover:text-blue-600"
								>
									Audience
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
							<th class="p-2 border-b font-semibold">
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
							<th class="p-2 border-b font-semibold">Code</th>
							<th class="p-2 border-b font-semibold">Survey</th>
							<th class="p-2 border-b font-semibold w-16"></th>
						</tr>
					</thead>
					<tbody>
						{#if isAddingEvent}
							<!-- Inline event creation row -->
							<tr class="border-2 border-blue-300 bg-blue-50 shadow-sm">
								<td class="p-2">
									<input
										type="text"
										bind:value={newEvent.name}
										placeholder="Event name"
										class="w-full border rounded px-2 py-1 text-sm {newEvent.name ? 'border-gray-300' : 'border-red-400'}"
										required
									/>
								</td>
								<td class="p-2">
									<div class="flex flex-col gap-1">
										<DatePicker
											bind:value={newEvent.date}
											placeholder="Select date"
											required
										/>
										<div class="flex gap-1 items-center">
											<TimePicker bind:value={newEvent.startTime} />
											<span class="text-gray-400">–</span>
											<TimePicker
												bind:value={newEvent.endTime}
												minTime={newEvent.startTime}
												disabled={!newEvent.startTime}
											/>
										</div>
									</div>
								</td>
								<td class="p-2">
									<select
										bind:value={newEvent.eventType}
										class="w-full border rounded px-2 py-1 text-sm"
									>
										<option value="" disabled>Select event type...</option>
										{#each eventTypes as type (type.name)}
											<option value={type.name}>{type.name}</option>
										{/each}
									</select>
								</td>
								<td class="p-2 w-32">
									<div class="relative">
										<button
											type="button"
											onclick={() => newEventCohortDropdownOpen = !newEventCohortDropdownOpen}
											class="w-full text-left border rounded px-2 py-1 text-sm bg-white hover:border-blue-300 flex justify-between items-center"
										>
											<span class="truncate">
												{#if !newEvent.isPublic && newEvent.cohortIds.length === 0}
													<span class="text-gray-400">Select audience...</span>
												{:else}
													{@const count = (newEvent.isPublic ? 1 : 0) + newEvent.cohortIds.length}
													{#if count === 1}
														{#if newEvent.isPublic}Open{:else}{getCohortName(newEvent.cohortIds[0])}{/if}
													{:else}
														{count} selected
													{/if}
												{/if}
											</span>
											<span class="text-gray-400 ml-1">{newEventCohortDropdownOpen ? '▲' : '▼'}</span>
										</button>
										{#if newEventCohortDropdownOpen}
											<div class="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto">
												<label class="flex items-center px-2 py-1.5 hover:bg-green-50 cursor-pointer text-sm border-b">
													<input
														type="checkbox"
														checked={newEvent.isPublic}
														onchange={() => newEvent.isPublic = !newEvent.isPublic}
														class="mr-2"
													/>
													<span class="text-green-700 font-medium">Open</span>
													<span class="text-gray-400 text-xs ml-1">(external check-in)</span>
												</label>
												{#each data.cohorts as cohort (cohort.id)}
													<label class="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
														<input
															type="checkbox"
															checked={newEvent.cohortIds.includes(cohort.id)}
															onchange={() => {
																if (newEvent.cohortIds.includes(cohort.id)) {
																	newEvent.cohortIds = newEvent.cohortIds.filter(id => id !== cohort.id);
																}
																else {
																	newEvent.cohortIds = [...newEvent.cohortIds, cohort.id];
																}
															}}
															class="mr-2"
														/>
														{cohort.name}
													</label>
												{/each}
											</div>
										{/if}
									</div>
								</td>
								<td class="p-2 text-center text-gray-400">—</td>
								<td class="p-2 text-center">
									{#if newEvent.isPublic}
										<input
											type="number"
											bind:value={newEvent.checkInCode}
											placeholder="Code"
											class="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs text-center no-spinner"
											min="0"
											max="999999"
										/>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td class="p-2">
									<div class="relative">
										<button
											type="button"
											onclick={() => showNewEventSurvey = !showNewEventSurvey}
											class="{newEvent.surveyUrl ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'}"
											title={newEvent.surveyUrl ? 'Edit survey URL' : 'Add survey URL'}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
												<path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
											</svg>
										</button>
										{#if showNewEventSurvey}
											<div class="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96">
												<textarea
													bind:value={newEvent.surveyUrl}
													placeholder="Paste survey URL..."
													class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
													rows="3"
												></textarea>
												<div class="flex gap-2 mt-3">
													<button
														type="button"
														onclick={() => showNewEventSurvey = false}
														class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
													>
														Done
													</button>
													<button
														type="button"
														onclick={() => newEvent.surveyUrl = ''}
														class="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
													>
														Clear
													</button>
												</div>
											</div>
										{/if}
									</div>
								</td>
								<td class="p-2">
									<div class="flex gap-1">
										<button
											onclick={handleAddEventSubmit}
											disabled={addEventSubmitting || !newEvent.name || !newEvent.date || !newEvent.startTime}
											class="text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
											title={!newEvent.name || !newEvent.date || !newEvent.startTime ? 'Fill in all required fields (name, date, time)' : 'Save'}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
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
					</tbody>
					{#each sortedEvents as event (event.id)}
							{@const expectedAttendance = event.cohortIds.length > 0 ? getTotalApprenticeCount(event.cohortIds) : null}
							{@const isExpanded = expandedEventId === event.id}
							{@const hasRoster = (event.attendanceCount ?? 0) > 0 || expectedAttendance !== null}
							{@const isPast = isPastEvent(event.dateTime)}
							{@const isSelected = selectedEventId === event.id}
							{@const isEditing = editingEventId === event.id}
							<tbody class="event-group" class:selected={isSelected}>
							{#if isEditing}
								<!-- Inline edit row -->
								<tr class="border-2 border-yellow-300 bg-yellow-50 shadow-sm">
									<td class="p-2">
										<input
											type="text"
											bind:value={editEvent.name}
											placeholder="Event name"
											class="w-full border rounded px-2 py-1 text-sm {editEvent.name ? 'border-gray-300' : 'border-red-400'}"
											onclick={e => e.stopPropagation()}
										/>
									</td>
									<td class="p-2">
									<div class="flex flex-col gap-1">
										<DatePicker
											bind:value={editEvent.date}
											placeholder="Select date"
											required
										/>
										<div class="flex gap-1 items-center">
											<TimePicker bind:value={editEvent.startTime} />
											<span class="text-gray-400">–</span>
											<TimePicker
												bind:value={editEvent.endTime}
												minTime={editEvent.startTime}
												disabled={!editEvent.startTime}
											/>
										</div>
									</div>
									</td>
									<td class="p-2">
										<select
											bind:value={editEvent.eventType}
											class="w-full border rounded px-2 py-1 text-sm"
											onclick={e => e.stopPropagation()}
										>
											{#each eventTypes as type (type.name)}
												<option value={type.name}>{type.name}</option>
											{/each}
										</select>
									</td>
									<td class="p-2 w-32">
										<div class="relative">
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation();
													editEventCohortDropdownOpen = !editEventCohortDropdownOpen;
												}}
												class="w-full text-left border rounded px-2 py-1 text-sm bg-white hover:border-blue-300 flex justify-between items-center"
											>
												<span class="truncate">
													{#if !editEvent.isPublic && editEvent.cohortIds.length === 0}
														<span class="text-gray-400">Select audience...</span>
													{:else}
														{@const count = (editEvent.isPublic ? 1 : 0) + editEvent.cohortIds.length}
														{#if count === 1}
															{#if editEvent.isPublic}Open{:else}{getCohortName(editEvent.cohortIds[0])}{/if}
														{:else}
															{count} selected
														{/if}
													{/if}
												</span>
												<span class="text-gray-400 ml-1">{editEventCohortDropdownOpen ? '▲' : '▼'}</span>
											</button>
											{#if editEventCohortDropdownOpen}
												<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
												<div
													class="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-y-auto"
													role="group"
													onmousedown={e => e.stopPropagation()}
												>
													<label class="flex items-center px-2 py-1.5 hover:bg-green-50 cursor-pointer text-sm border-b">
														<input
															type="checkbox"
															checked={editEvent.isPublic}
															onchange={() => editEvent.isPublic = !editEvent.isPublic}
															class="mr-2"
														/>
														<span class="text-green-700 font-medium">Open</span>
														<span class="text-gray-400 text-xs ml-1">(external check-in)</span>
													</label>
													{#each data.cohorts as cohort (cohort.id)}
														<label class="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
															<input
																type="checkbox"
																checked={editEvent.cohortIds.includes(cohort.id)}
																onchange={() => {
																	if (editEvent.cohortIds.includes(cohort.id)) {
																		editEvent.cohortIds = editEvent.cohortIds.filter(id => id !== cohort.id);
																	}
																	else {
																		editEvent.cohortIds = [...editEvent.cohortIds, cohort.id];
																	}
																}}
																class="mr-2"
															/>
															{cohort.name}
														</label>
													{/each}
												</div>
											{/if}
										</div>
									</td>
									<td class="p-2 text-center text-gray-400">—</td>
									<td class="p-2 text-center">
										{#if editEvent.isPublic}
											<input
												type="number"
												bind:value={editEvent.checkInCode}
												placeholder="Code"
												class="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs text-center no-spinner"
												min="0"
												max="999999"
												onclick={e => e.stopPropagation()}
											/>
										{:else}
											<span class="text-gray-400">—</span>
										{/if}
									</td>
									<td class="p-2">
									<div class="relative">
										<button
											type="button"
											onclick={(e) => {
												e.stopPropagation();
												showEditEventSurvey = !showEditEventSurvey;
											}}
											class="{editEvent.surveyUrl ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'}"
											title={editEvent.surveyUrl ? 'Edit survey URL' : 'Add survey URL'}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
												<path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
											</svg>
										</button>
										{#if showEditEventSurvey}
											<div class="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-96">
												<textarea
													bind:value={editEvent.surveyUrl}
													placeholder="Paste survey URL..."
													class="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
													rows="3"
													onclick={e => e.stopPropagation()}
												></textarea>
												<div class="flex gap-2 mt-3">
													<button
														type="button"
														onclick={(e) => {
															e.stopPropagation();
															showEditEventSurvey = false;
														}}
														class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
													>
														Done
													</button>
													<button
														type="button"
														onclick={(e) => {
															e.stopPropagation();
															editEvent.surveyUrl = '';
														}}
														class="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
													>
														Clear
													</button>
												</div>
											</div>
										{/if}
									</div>
									</td>
									<td class="p-2">
										<div class="flex gap-1">
											<button
												onclick={(e) => {
													e.stopPropagation();
													handleEditEventSubmit();
												}}
												disabled={editEventSubmitting || !editEvent.name || !editEvent.date || !editEvent.startTime}
												class="text-green-600 hover:text-green-800 disabled:opacity-50"
												title="Save"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
													<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
												</svg>
											</button>
											<button
												onclick={(e) => {
													e.stopPropagation();
													cancelEditEvent();
												}}
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
								{#if editEventError}
									<tr class="bg-red-50">
										<td colspan="8" class="p-2 text-red-600 text-sm">{editEventError}</td>
									</tr>
								{/if}
							{:else}
								<!-- Normal display row -->
								<tr
									data-event-id={event.id}
									class="border-b hover:bg-gray-50 transition-colors"
									class:cursor-pointer={hasRoster && !isAddingEvent}
									class:bg-blue-50={isExpanded}
									class:bg-stone-100={isPast && !isExpanded}
									class:opacity-50={isAddingEvent}
									class:pointer-events-none={isAddingEvent}
									onclick={() => {
										if (isAddingEvent) return;
										selectedEventId = event.id;
										if (hasRoster) toggleEventRow(event.id, event.dateTime);
									}}
								>
								<td class="p-2">
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
								<td class="p-2">
									<div>{formatDateOnly(event.dateTime)}</div>
									<div class="text-gray-500 text-sm">
										{formatTimeOnly(event.dateTime)}{#if event.endDateTime}&nbsp;–&nbsp;{formatTimeOnly(event.endDateTime)}{/if}
									</div>
								</td>
								<td class="p-2">
									{#if event.eventType}
										<span class="{eventTypeColors()[event.eventType]?.tailwind || 'text-gray-600'} font-medium">
											{event.eventType}
										</span>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td class="p-2 w-32">
									{#if event.isPublic || event.cohortIds.length > 0}
										{@const cohortNames = getCohortNames(event.cohortIds).join(', ')}
										{@const displayText = event.isPublic ? (cohortNames ? `Open, ${cohortNames}` : 'Open') : cohortNames}
										<span class="text-sm block truncate" title={displayText}>
											{#if event.isPublic}<span class="text-green-700 font-medium">Open</span>{#if event.cohortIds.length > 0}, {/if}{/if}{cohortNames}
										</span>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td class="p-2">
									{#if expectedAttendance !== null}
										<span class="font-mono text-sm">{event.attendanceCount ?? 0}/{expectedAttendance}</span>
									{:else}
										<span class="text-gray-400">{event.attendanceCount ?? 0}</span>
									{/if}
								</td>
								<td class="p-2">
									{#if event.checkInCode}
										<span class="font-mono text-sm">{event.checkInCode}</span>
									{:else}
										<span class="text-gray-400">—</span>
									{/if}
								</td>
								<td class="p-2">
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
										<span class="text-gray-300" title="No survey">
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
												<path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd" />
											</svg>
										</span>
									{/if}
								</td>
								<td class="p-2">
									<div class="flex gap-1">
										<button
											onclick={(e) => {
												e.stopPropagation();
												startEditingEvent(event);
											}}
											class="text-gray-500 hover:text-blue-600"
											title="Edit event"
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
											</svg>
										</button>
										<button
											onclick={(e) => {
												e.stopPropagation();
												toggleMarkForDelete(event.id);
											}}
											class={markedForDelete.has(event.id) ? 'text-red-600' : 'text-gray-400 hover:text-red-600'}
											title={markedForDelete.has(event.id) ? 'Unmark for delete' : 'Mark for delete'}
										>
											<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
												<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
							{/if}
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
																		class="{getStatusBadgeClass(person.status)} px-2 py-0.5 rounded text-xs hover:ring-2 hover:ring-offset-1 hover:ring-gray-300"
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
							</tbody>
						{/each}
				</table>
			</div>
			<p class="text-gray-400 text-sm mt-4">Showing {sortedEvents.length} event(s)</p>
		{/if}

		<!-- Calendar view with date selection for series creation -->
		<section class="mt-8 flex flex-col">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold">Calendar</h2>
				<div class="flex items-center gap-3">
					{#if isCreatingSeries && selectedDates.length > 0}
						<span class="text-sm text-gray-600">
							{selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
						</span>
						<button
							onclick={() => { selectedDates = []; }}
							class="text-sm text-red-600 hover:text-red-800"
						>
							Clear
						</button>
					{/if}
					{#if !isCreatingSeries}
						<button
							onclick={() => { isCreatingSeries = true; }}
							disabled={isAddingEvent}
							class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
						>
							+ Create Series
						</button>
					{/if}
				</div>
			</div>

			{#if isCreatingSeries}
				<!-- Series creation form (above calendar) -->
				<div class="bg-green-50 border border-green-200 rounded-lg p-6 mb-4" transition:slide={{ duration: 300 }}>
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-green-800">
							Create Event Series
							{#if selectedDates.length > 0}
								<span class="font-normal text-green-600">({selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected)</span>
							{/if}
						</h3>
						<button
							onclick={cancelSeriesForm}
							class="text-green-700 hover:text-green-900 text-sm underline"
						>
							Cancel
						</button>
					</div>

					{#if seriesError}
						<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
							{seriesError}
						</div>
					{/if}

					<form onsubmit={handleSeriesSubmit} class="space-y-4">
						<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
							<div>
								<label for="seriesName" class="block text-sm font-medium text-gray-700 mb-1">
									Base Name <span class="text-red-500">*</span>
								</label>
								<input
									type="text"
									id="seriesName"
									bind:value={seriesName}
									required
									class="w-full border rounded px-3 py-2 {seriesName ? 'border-gray-300' : 'border-red-400'}"
									placeholder="e.g. AI Workshop"
								/>
								<p class="text-xs text-gray-500 mt-1">Numbers appended if multiple dates</p>
							</div>

							<div>
								<label for="seriesTime" class="block text-sm font-medium text-gray-700 mb-1">
									Start Time <span class="text-red-500">*</span>
								</label>
								<TimePicker bind:value={seriesTime} />
							</div>

							<div>
								<label for="seriesEndTime" class="block text-sm font-medium text-gray-700 mb-1">
									End Time <span class="text-red-500">*</span>
								</label>
								<TimePicker
									bind:value={seriesEndTime}
									minTime={seriesTime}
									disabled={!seriesTime}
								/>
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
									<option value="" disabled>Select event type...</option>
									{#each eventTypes as type (type.name)}
										<option value={type.name}>{type.name}</option>
									{/each}
								</select>
							</div>

							<div>
								<span class="block text-sm font-medium text-gray-700 mb-1">
									Audience
								</span>
								<div class="relative">
									<button
										type="button"
										onclick={() => seriesCohortDropdownOpen = !seriesCohortDropdownOpen}
										class="w-full text-left border rounded px-3 py-2 bg-white hover:border-blue-300 flex justify-between items-center"
									>
										<span class="truncate">
											{#if !seriesIsPublic && seriesCohortIds.length === 0}
												<span class="text-gray-400">Select audience (optional)...</span>
											{:else}
												{@const count = (seriesIsPublic ? 1 : 0) + seriesCohortIds.length}
												{#if count === 1}
													{#if seriesIsPublic}Open{:else}{getCohortName(seriesCohortIds[0])}{/if}
												{:else}
													{count} selected
												{/if}
											{/if}
										</span>
										<span class="text-gray-400 ml-1">{seriesCohortDropdownOpen ? '▲' : '▼'}</span>
									</button>
									{#if seriesCohortDropdownOpen}
										<div class="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-64 overflow-y-auto">
											<label class="flex items-center px-3 py-2 hover:bg-green-50 cursor-pointer border-b">
												<input
													type="checkbox"
													checked={seriesIsPublic}
													onchange={() => seriesIsPublic = !seriesIsPublic}
													class="mr-2"
												/>
												<span class="text-green-700 font-medium">Open</span>
												<span class="text-gray-400 text-xs ml-1">(external check-in)</span>
											</label>
											{#each data.cohorts as cohort (cohort.id)}
												<label class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
													<input
														type="checkbox"
														checked={seriesCohortIds.includes(cohort.id)}
														onchange={() => {
															if (seriesCohortIds.includes(cohort.id)) {
																seriesCohortIds = seriesCohortIds.filter(id => id !== cohort.id);
															}
															else {
																seriesCohortIds = [...seriesCohortIds, cohort.id];
															}
														}}
														class="mr-2"
													/>
													{cohort.name}
												</label>
											{/each}
										</div>
									{/if}
								</div>
							</div>

							<div>
								<label for="seriesSurveyUrl" class="block text-sm font-medium text-gray-700 mb-1">
									Survey URL
								</label>
								<div class="space-y-2">
									<textarea
										id="seriesSurveyUrl"
										bind:value={seriesSurveyUrl}
										class="w-full border rounded px-3 py-2 resize-none"
										placeholder="https://..."
										rows="3"
									></textarea>
									{#if seriesSurveyUrl}
										<button
											type="button"
											onclick={() => seriesSurveyUrl = ''}
											class="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
										>
											Clear
										</button>
									{/if}
								</div>
							</div>

							{#if seriesIsPublic}
								<div class="flex items-center gap-2 pt-2">
									<label for="seriesCheckInCode" class="text-sm font-medium text-gray-700">Check-in code:</label>
									<input
										type="number"
										id="seriesCheckInCode"
										bind:value={seriesCheckInCode}
										class="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center no-spinner"
										min="0"
										max="999999"
									/>
								</div>
							{/if}
						</div>

						<!-- Instruction to select dates -->
						<div class="bg-green-100 border border-green-300 rounded p-3">
							<p class="text-sm text-green-800">
								<strong>Next:</strong> Click on future dates in the calendar below to select them for this series.
							</p>
						</div>

						<!-- Selected dates preview -->
						{#if selectedDates.length > 0}
							<div class="border-t border-green-200 pt-4">
								<p class="text-sm font-medium text-gray-700 mb-2">Selected dates:</p>
								<div class="flex flex-wrap gap-2">
									{#each selectedDates as date, i (date.toISOString())}
										<span class="inline-flex items-center gap-1 bg-white border border-green-300 rounded-full px-3 py-1 text-sm">
											<span class="text-gray-700">{formatPreviewDate(date)}</span>
											{#if selectedDates.length > 1}
												<span class="text-gray-400">→ {seriesName || 'Event'} {i + 1}</span>
											{/if}
											<button
												type="button"
												onclick={() => removeDate(date)}
												class="text-red-500 hover:text-red-700 ml-1"
												aria-label="Remove date"
											>
												<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
													<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											</button>
										</span>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Progress indicator -->
						{#if seriesProgress}
							<div class="bg-blue-50 border border-blue-200 px-4 py-3 rounded">
								Creating events... {seriesProgress.created} / {seriesProgress.total}
							</div>
						{/if}

						<div class="flex gap-3 pt-2">
							<button
								type="submit"
								disabled={seriesSubmitting || !seriesName || selectedDates.length === 0}
								class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
							>
								{#if seriesSubmitting}
									Creating...
								{:else if selectedDates.length === 0}
									Select dates below
								{:else}
									Create {selectedDates.length} Event{selectedDates.length !== 1 ? 's' : ''}
								{/if}
							</button>
							<button
								type="button"
								onclick={cancelSeriesForm}
								class="px-4 py-2 border rounded hover:bg-gray-50"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			{/if}

			<!-- Legend -->
			<div class="flex flex-wrap gap-4 mb-4 text-sm">
				{#each eventTypes as type (type.name)}
					<div class="flex items-center gap-2">
						<span
							class="w-3 h-3 rounded-full"
							style="background-color: {type.color}"
						></span>
						<span class="{type.tailwindClass}">{type.name}</span>
					</div>
				{/each}
				{#if isCreatingSeries}
					<div class="flex items-center gap-2">
						<span class="w-3 h-3 rounded-full bg-green-500"></span>
						<span class="text-green-700">Selected for series</span>
					</div>
				{/if}
			</div>
			<div class="ec-calendar-wrapper bg-white border border-gray-200 rounded-xl shadow-sm p-4" class:series-mode={isCreatingSeries}>
				<Calendar plugins={calendarPlugins} options={calendarOptions} />
			</div>
		</section>
</div>

<style>
	.ec-calendar-wrapper {
		width: 100%;
		min-height: 0; /* Allow flex shrinking */
	}

	/* Let the calendar component size itself naturally */
	.ec-calendar-wrapper :global(.ec) {
		height: auto !important;
		min-height: 500px;
	}

	/* Style past dates as slightly muted */
	.ec-calendar-wrapper :global(.ec-day.ec-past) {
		opacity: 0.6;
	}

	/* Series mode: make future dates look clickable */
	.ec-calendar-wrapper.series-mode :global(.ec-day:not(.ec-past)) {
		cursor: pointer;
	}

	.ec-calendar-wrapper.series-mode :global(.ec-day:not(.ec-past):hover) {
		background-color: rgba(34, 197, 94, 0.1);
	}

	/* Selected event group styling */
	:global(.event-group.selected) {
		outline: 2px solid rgb(59, 130, 246);
		outline-offset: -2px;
	}

	/* Hide spinner arrows on number inputs */
	input[type='number'].no-spinner::-webkit-outer-spin-button,
	input[type='number'].no-spinner::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type='number'].no-spinner {
		appearance: textfield;
		-moz-appearance: textfield;
	}
</style>
