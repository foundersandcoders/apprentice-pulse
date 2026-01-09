<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Make events reactive - need $state for mutation in event handlers
	// eslint-disable-next-line svelte/prefer-writable-derived
	let events = $state<typeof data.events>([]);

	// Update events when data changes (page navigation)
	$effect(() => {
		events = [...data.events];
	});

	// Extract event types and build color mapping (same pattern as admin events page)
	const eventTypes = $derived(data.eventTypes);
	const eventTypeColors = $derived(() => {
		const colorMap: Record<string, { main: string; tailwind: string; bgClass: string; textClass: string; borderClass: string }> = {};
		eventTypes.forEach((type) => {
			// Convert hex color to Tailwind background and text classes
			const bgClass = convertToTailwindBg(type.color);
			const textClass = convertToTailwindText(type.color);
			const borderClass = convertToTailwindBorder(type.color);

			colorMap[type.name] = {
				main: type.color,
				tailwind: type.tailwindClass,
				bgClass,
				textClass,
				borderClass,
			};
		});
		return colorMap;
	});

	// Helper functions to convert hex colors to Tailwind classes
	function convertToTailwindBg(hexColor: string): string {
		const colorMap: Record<string, string> = {
			'#3b82f6': 'bg-blue-100',
			'#10b981': 'bg-emerald-100',
			'#f59e0b': 'bg-amber-100',
			'#8b5cf6': 'bg-violet-100',
			'#ef4444': 'bg-red-100',
			'#06b6d4': 'bg-cyan-100',
			'#84cc16': 'bg-lime-100',
			'#f97316': 'bg-orange-100',
			'#ec4899': 'bg-pink-100',
			'#6b7280': 'bg-gray-100',
		};
		return colorMap[hexColor] || 'bg-slate-100';
	}

	function convertToTailwindText(hexColor: string): string {
		const colorMap: Record<string, string> = {
			'#3b82f6': 'text-blue-800',
			'#10b981': 'text-emerald-800',
			'#f59e0b': 'text-amber-800',
			'#8b5cf6': 'text-violet-800',
			'#ef4444': 'text-red-800',
			'#06b6d4': 'text-cyan-800',
			'#84cc16': 'text-lime-800',
			'#f97316': 'text-orange-800',
			'#ec4899': 'text-pink-800',
			'#6b7280': 'text-gray-800',
		};
		return colorMap[hexColor] || 'text-slate-800';
	}

	function convertToTailwindBorder(hexColor: string): string {
		const colorMap: Record<string, string> = {
			'#3b82f6': 'border-blue-300',
			'#10b981': 'border-emerald-300',
			'#f59e0b': 'border-amber-300',
			'#8b5cf6': 'border-violet-300',
			'#ef4444': 'border-red-300',
			'#06b6d4': 'border-cyan-300',
			'#84cc16': 'border-lime-300',
			'#f97316': 'border-orange-300',
			'#ec4899': 'border-pink-300',
			'#6b7280': 'border-gray-300',
		};
		return colorMap[hexColor] || 'border-slate-300';
	}

	// Check-in state for authenticated users
	let checkingIn = $state<string | null>(null);
	let markingNotComing = $state<string | null>(null);
	let checkInError = $state<string | null>(null);

	// Absence reason state
	let showingReasonFor = $state<string | null>(null);
	let absenceReason = $state('');

	// Guest check-in state
	let guestStep = $state<'code' | 'events' | 'details' | 'success'>('code');
	let guestCode = $state('');
	let guestName = $state('');
	let guestEmail = $state('');
	let guestEvents = $state<{ id: string; name: string; dateTime: string; eventType: string; attendanceCount: number }[]>([]);
	let guestSelectedEvent = $state<{ id: string; name: string; dateTime: string; eventType: string; attendanceCount: number } | null>(null);
	let guestError = $state('');
	let guestLoading = $state(false);

	// Live countdown timer
	let now = $state(Date.now());
	const timerInterval = setInterval(() => {
		now = Date.now();
	}, 1000);
	onDestroy(() => clearInterval(timerInterval));

	// Check if event is today
	function isToday(dateTime: string): boolean {
		const eventDate = new Date(dateTime);
		const today = new Date(now);
		return eventDate.toDateString() === today.toDateString();
	}

	// Calculate countdown/late status for an event
	function getTimeStatus(dateTime: string): { text: string; isLate: boolean; isStartingSoon: boolean; canCheckIn: boolean } {
		const eventTime = new Date(dateTime).getTime();
		const diff = eventTime - now;
		const absDiff = Math.abs(diff);
		const eventIsToday = isToday(dateTime);

		const hours = Math.floor(absDiff / (1000 * 60 * 60));
		const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

		if (diff > 0) {
			// Event hasn't started yet
			let text = 'Starts in ';
			if (hours > 0) text += `${hours}h `;
			if (hours > 0 || minutes > 0) text += `${minutes}m `;
			text += `${seconds}s`;
			return { text, isLate: false, isStartingSoon: diff < 10 * 60 * 1000, canCheckIn: eventIsToday };
		}
		else {
			// Event has started - user is late
			let text = '';
			if (hours > 0) text += `${hours}h `;
			if (hours > 0 || minutes > 0) text += `${minutes}m `;
			if (hours === 0) text += `${seconds}s `;
			text += 'late';
			return { text, isLate: true, isStartingSoon: false, canCheckIn: true };
		}
	}

	// Format date for display
	function formatDate(dateTime: string): string {
		const date = new Date(dateTime);
		return date.toLocaleDateString('en-GB', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	// Authenticated user check-in
	async function handleCheckIn(eventId: string) {
		// Prevent double-clicking by checking if already processing this event
		if (checkingIn === eventId || markingNotComing === eventId) {
			return;
		}

		checkingIn = eventId;
		checkInError = null;

		try {
			const response = await fetch('/api/checkin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId }),
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Update the event in the list to show as checked in
				events = events.map(e =>
					e.id === eventId ? { ...e, attendanceStatus: 'checked-in' as const } : e,
				);
				checkInError = null; // Clear any previous errors
				console.log('Check-in successful, updated UI for event:', eventId);
			}
			else {
				checkInError = result.error || 'Check-in failed';
			}
		}
		catch {
			checkInError = 'Network error. Please try again.';
		}
		finally {
			checkingIn = null;
		}
	}

	// Show absence reason input
	function showReasonInput(eventId: string) {
		showingReasonFor = eventId;
		absenceReason = '';
		checkInError = null;
	}

	// Hide absence reason input
	function hideReasonInput() {
		showingReasonFor = null;
		absenceReason = '';
	}

	// Authenticated user mark as absent
	async function handleNotComing(eventId: string, reason?: string) {
		// Prevent double-clicking by checking if already processing this event
		if (markingNotComing === eventId || checkingIn === eventId) {
			return;
		}

		markingNotComing = eventId;
		checkInError = null;

		try {
			const response = await fetch('/api/checkin/absent', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId, reason }),
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Update the event in the list to show as absent
				events = events.map(e =>
					e.id === eventId ? { ...e, attendanceStatus: 'absent' as const } : e,
				);
				checkInError = null; // Clear any previous errors
			}
			else if (result.error?.includes('already has an attendance record')) {
				// User already has a record - update UI to show as checked in
				events = events.map(e =>
					e.id === eventId ? { ...e, attendanceStatus: 'checked-in' as const } : e,
				);
				checkInError = 'You already have an attendance record for this event.';
			}
			else {
				checkInError = result.error || 'Failed to mark as absent';
			}
		}
		catch {
			checkInError = 'Network error. Please try again.';
		}
		finally {
			markingNotComing = null;
			hideReasonInput();
		}
	}

	// Guest: validate code
	async function handleCodeSubmit(e: SubmitEvent) {
		e.preventDefault();
		guestError = '';
		guestLoading = true;

		try {
			const response = await fetch('/api/checkin/validate-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: guestCode }),
			});

			const result = await response.json();

			if (result.valid && result.events) {
				guestEvents = result.events;
				guestStep = 'events';
			}
			else {
				guestError = result.error || 'Invalid code';
			}
		}
		catch {
			guestError = 'Network error. Please try again.';
		}
		finally {
			guestLoading = false;
		}
	}

	// Guest: select event to check in to
	function selectGuestEvent(event: typeof guestEvents[0]) {
		guestSelectedEvent = event;
		guestStep = 'details';
	}

	// Guest: submit check-in
	async function handleGuestCheckIn(e: SubmitEvent) {
		e.preventDefault();
		guestError = '';
		guestLoading = true;

		try {
			const response = await fetch('/api/checkin/external', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					eventId: guestSelectedEvent?.id,
					code: guestCode,
					name: guestName,
					email: guestEmail,
				}),
			});

			const result = await response.json();

			if (result.success) {
				guestStep = 'success';
			}
			else if (result.isRegisteredUser) {
				guestError = 'This email is registered. Please log in instead.';
			}
			else {
				guestError = result.error || 'Check-in failed';
			}
		}
		catch {
			guestError = 'Network error. Please try again.';
		}
		finally {
			guestLoading = false;
		}
	}

	// Reset guest form
	function resetGuestForm() {
		guestStep = 'code';
		guestCode = '';
		guestName = '';
		guestEmail = '';
		guestEvents = [];
		guestSelectedEvent = null;
		guestError = '';
	}

	// Go back to event selection
	function backToEventSelection() {
		guestStep = 'events';
		guestSelectedEvent = null;
		guestError = '';
	}
</script>

<svelte:head>
	<title>Check In - Apprentice Pulse</title>
</svelte:head>

<div class="p-6 max-w-2xl mx-auto">
	{#if data.authenticated}
		<!-- Authenticated user view -->
		<header class="mb-6 flex justify-between items-start">
			<div>
				<h1 class="text-2xl font-bold">Check In</h1>
				<p class="text-gray-600 mt-1">Logged as: {data.user?.email}</p>
			</div>
			<div class="flex gap-4 text-sm">
				{#if data.user?.type === 'staff' || data.user?.type === 'external'}
					<a href={resolve('/admin')} class="text-blue-600 hover:underline">Admin</a>
				{/if}
				<a href={resolve('/api/auth/logout')} class="text-gray-500 hover:text-gray-700">Logout</a>
			</div>
		</header>

		{#if events.length === 0}
			<div class="text-center py-12 text-gray-500">
				<p>No events available for check-in right now.</p>
			</div>
		{:else}
			<div class="space-y-4">
				{#each events as event (event.id)}
					{@const timeStatus = getTimeStatus(event.dateTime)}
					{@const typeColors = eventTypeColors()[event.eventType]}
					<div class="bg-white border rounded-xl shadow-sm transition-all overflow-hidden {typeColors?.borderClass || 'border-gray-200'}">
						<!-- Title stripe -->
						<div class="px-6 py-4 {typeColors?.bgClass || 'bg-slate-100'}">
							<h2 class="text-lg font-semibold {typeColors?.textClass || 'text-slate-800'}">{event.name}</h2>
						</div>
						<!-- Card content -->
						<div class="p-6">
							<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
								<div class="flex-1">
									<p class="text-gray-600 text-sm mb-2">{formatDate(event.dateTime)}</p>
									<div class="flex items-center gap-3 mb-2">
									<span class="text-xs text-gray-500 uppercase tracking-wide">{event.eventType}</span>
									{#if event.expectedCount > 0}
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
											{event.attendanceCount}/{event.expectedCount}
										</span>
									{:else if event.attendanceCount > 0}
										<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
											{event.attendanceCount} checked in
										</span>
									{/if}
								</div>
								{#if event.attendanceStatus === 'none'}
									<span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium"
										class:bg-red-100={timeStatus.isLate}
										class:text-red-800={timeStatus.isLate}
										class:bg-orange-100={timeStatus.isStartingSoon && !timeStatus.isLate}
										class:text-orange-800={timeStatus.isStartingSoon && !timeStatus.isLate}
										class:bg-blue-100={!timeStatus.isLate && !timeStatus.isStartingSoon}
										class:text-blue-800={!timeStatus.isLate && !timeStatus.isStartingSoon}>
										{timeStatus.text}
									</span>
								{/if}
							</div>
							<div class="flex flex-col sm:flex-col gap-2 w-full sm:w-auto sm:min-w-[140px]">
								{#if event.attendanceStatus === 'checked-in'}
									<span class="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-center font-medium">✓ Checked In</span>
								{:else if event.attendanceStatus === 'absent'}
									<span class="w-full px-4 py-2 bg-orange-600 text-white rounded-lg text-center font-medium">Absent</span>
									{#if timeStatus.canCheckIn}
										<button class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											onclick={() => handleCheckIn(event.id)}
											disabled={checkingIn === event.id}>
											{checkingIn === event.id ? 'Checking in...' : 'Check In Instead'}
										</button>
									{/if}
								{:else if checkingIn === event.id || markingNotComing === event.id}
									<button class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed" disabled>
										{checkingIn === event.id ? 'Checking in...' : 'Marking absent...'}
									</button>
								{:else if !timeStatus.canCheckIn}
									<button class="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
										disabled
										title="Check-in opens on the day of the event">
										Check In
									</button>
								{:else if showingReasonFor === event.id}
									<!-- Absence reason form -->
									<div class="space-y-3">
										<label for="reason-{event.id}" class="block text-sm font-medium text-gray-700">
											Reason for absence (optional):
										</label>
										<textarea
											id="reason-{event.id}"
											bind:value={absenceReason}
											placeholder="Brief reason for absence..."
											class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
											rows="2"
										></textarea>
										<div class="flex gap-2">
											<button class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
												onclick={() => handleNotComing(event.id, absenceReason)}
												disabled={markingNotComing === event.id}>
												{markingNotComing === event.id ? 'Marking absent...' : 'Mark Absent'}
											</button>
											<button class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
												onclick={hideReasonInput}
												disabled={markingNotComing === event.id}>
												Cancel
											</button>
										</div>
									</div>
								{:else}
									<button class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
										onclick={() => handleCheckIn(event.id)}
										disabled={checkingIn !== null || markingNotComing !== null}>
										Check In
									</button>
									{#if data.checkInMethod === 'apprentice'}
										<button class="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											onclick={() => showReasonInput(event.id)}
											disabled={checkingIn !== null || markingNotComing !== null}>
											Absent
										</button>
									{/if}
								{/if}
							</div>
						</div>
					</div>
					</div>
				{/each}
			</div>

			{#if checkInError}
				<div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
					{checkInError}
				</div>
			{/if}
		{/if}

	{:else}
		<!-- Guest check-in view -->
		<header class="mb-6 flex justify-between items-start">
			<div>
				<h1 class="text-2xl font-bold">Check In</h1>
				<p class="text-gray-600 mt-1">Guest access - no account required</p>
			</div>
			<div class="flex gap-4 text-sm">
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static path -->
				<button class="text-blue-600 hover:underline" onclick={() => goto('/login')}>
					Log in
				</button>
			</div>
		</header>

		<div class="space-y-6">
			{#if guestStep === 'code'}
				<div class="bg-white border rounded-xl shadow-sm overflow-hidden border-gray-200">
					<!-- Title stripe -->
					<div class="px-6 py-4 bg-blue-50">
						<h2 class="text-lg font-semibold text-blue-800">Enter Event Code</h2>
					</div>
					<!-- Card content -->
					<div class="p-6">
						<p class="text-gray-600 text-center mb-6">Enter the 4-digit event code displayed at the venue.</p>
						<form onsubmit={handleCodeSubmit} class="max-w-sm mx-auto">
							<label for="code" class="block text-sm font-medium text-gray-700 mb-2">Event Code</label>
							<input
								type="text"
								id="code"
								bind:value={guestCode}
								placeholder="1234"
								maxlength="4"
								inputmode="numeric"
								autocomplete="off"
								disabled={guestLoading}
								class="w-full px-4 py-3 text-2xl text-center tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
							/>
							<button
								type="submit"
								disabled={guestLoading || guestCode.length !== 4}
								class="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
								{guestLoading ? 'Validating...' : 'Continue'}
							</button>
						</form>

						{#if guestError}
							<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
								{guestError}
							</div>
						{/if}

						<p class="text-center mt-6 text-sm text-gray-600">
							Have an account?
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static path -->
							<button class="text-blue-600 hover:underline font-medium" onclick={() => goto('/login?redirect=/checkin')}>
								Log in
							</button>
							for easier check-in.
						</p>
					</div>
				</div>

			{:else if guestStep === 'events'}
				<div class="bg-white border rounded-xl shadow-sm overflow-hidden border-gray-200">
					<!-- Title stripe -->
					<div class="px-6 py-4 bg-green-50">
						<h2 class="text-lg font-semibold text-green-800">Select Event</h2>
					</div>
					<!-- Card content -->
					<div class="p-6">
						<p class="text-gray-600 text-center mb-6">Select the event you want to check in to:</p>

						<div class="space-y-4">
					{#each guestEvents as event (event.id)}
						{@const timeStatus = getTimeStatus(event.dateTime)}
						{@const typeColors = eventTypeColors()[event.eventType]}
						<div class="border rounded-xl overflow-hidden {typeColors?.borderClass || 'border-gray-200'}">
							<!-- Title stripe -->
							<div class="px-4 py-3 {typeColors?.bgClass || 'bg-slate-100'}">
								<h3 class="font-semibold {typeColors?.textClass || 'text-slate-800'}">{event.name}</h3>
							</div>
							<!-- Card content -->
							<div class="p-4">
								<div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
									<div class="flex-1">
										<p class="text-gray-600 text-sm mb-2">{formatDate(event.dateTime)}</p>
										<div class="flex items-center gap-3 mb-2">
										<span class="text-xs text-gray-500 uppercase tracking-wide">{event.eventType}</span>
										{#if event.attendanceCount > 0}
											<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
												{event.attendanceCount} checked in
											</span>
										{/if}
									</div>
									<span class="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium"
										class:bg-red-100={timeStatus.isLate}
										class:text-red-800={timeStatus.isLate}
										class:bg-orange-100={timeStatus.isStartingSoon && !timeStatus.isLate}
										class:text-orange-800={timeStatus.isStartingSoon && !timeStatus.isLate}
										class:bg-blue-100={!timeStatus.isLate && !timeStatus.isStartingSoon}
										class:text-blue-800={!timeStatus.isLate && !timeStatus.isStartingSoon}>
										{timeStatus.text}
									</span>
								</div>
								<div class="w-full sm:w-auto sm:min-w-[140px]">
									{#if !timeStatus.canCheckIn}
										<button
											class="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed"
											disabled
											title="Check-in opens on the day of the event">
											Check In
										</button>
									{:else}
										<button
											class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
											onclick={() => selectGuestEvent(event)}>
											Check In
										</button>
									{/if}
								</div>
							</div>
						</div>
						</div>
						{/each}
					</div>

					<div class="text-center mt-6">
						<button class="text-blue-600 hover:underline text-sm" onclick={resetGuestForm}>
							Use a different code
						</button>
					</div>
				</div>
			</div>

			{:else if guestStep === 'details'}
				{@const guestTimeStatus = guestSelectedEvent ? getTimeStatus(guestSelectedEvent.dateTime) : null}
				{@const selectedTypeColors = guestSelectedEvent ? eventTypeColors()[guestSelectedEvent.eventType] : null}
				<div class="bg-white border rounded-xl shadow-sm overflow-hidden border-gray-200">
					<!-- Title stripe with event type color -->
					<div class="px-6 py-4 {selectedTypeColors?.bgClass || 'bg-slate-100'}">
						<h2 class="text-lg font-semibold {selectedTypeColors?.textClass || 'text-slate-800'}">
							{guestSelectedEvent?.name}
						</h2>
					</div>
					<!-- Card content -->
					<div class="p-6">
						<div class="mb-6">
							<p class="text-gray-600 text-sm">{guestSelectedEvent ? formatDate(guestSelectedEvent.dateTime) : ''}</p>
							{#if guestTimeStatus}
								<span class="inline-flex items-center mt-2 px-3 py-1 rounded-lg text-sm font-medium"
									class:bg-red-100={guestTimeStatus.isLate}
									class:text-red-800={guestTimeStatus.isLate}
									class:bg-orange-100={guestTimeStatus.isStartingSoon && !guestTimeStatus.isLate}
									class:text-orange-800={guestTimeStatus.isStartingSoon && !guestTimeStatus.isLate}
									class:bg-blue-100={!guestTimeStatus.isLate && !guestTimeStatus.isStartingSoon}
									class:text-blue-800={!guestTimeStatus.isLate && !guestTimeStatus.isStartingSoon}>
									{guestTimeStatus.text}
								</span>
							{/if}
						</div>

						<form onsubmit={handleGuestCheckIn} class="max-w-sm mx-auto">
					<div class="mb-4">
						<label for="name" class="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
						<input
							type="text"
							id="name"
							bind:value={guestName}
							placeholder="Full name"
							required
							disabled={guestLoading}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
						/>
					</div>

					<div class="mb-6">
						<label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
						<input
							type="email"
							id="email"
							bind:value={guestEmail}
							placeholder="you@example.com"
							required
							disabled={guestLoading}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
						/>
					</div>

							<button
								type="submit"
								disabled={guestLoading}
								class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium">
								{guestLoading ? 'Checking in...' : 'Check In'}
							</button>
						</form>

						{#if guestError}
							<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
								{guestError}
							</div>
						{/if}

						<div class="text-center mt-6">
							<button class="text-blue-600 hover:underline text-sm" onclick={backToEventSelection}>
								Select a different event
							</button>
						</div>
					</div>
				</div>

			{:else if guestStep === 'success'}
				<div class="bg-white border rounded-xl shadow-sm overflow-hidden border-gray-200">
					<!-- Title stripe -->
					<div class="px-6 py-4 bg-green-50">
						<h2 class="text-lg font-semibold text-green-800">✓ You're checked in!</h2>
					</div>
					<!-- Card content -->
					<div class="p-6 text-center">
						<p class="text-gray-700 mb-6">Welcome to <strong>{guestSelectedEvent?.name}</strong></p>
						<button
							onclick={resetGuestForm}
							class="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
							Check in to another event
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
