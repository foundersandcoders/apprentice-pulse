<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Check-in state for authenticated users
	let checkingIn = $state<string | null>(null);
	let markingNotComing = $state<string | null>(null);
	let checkInError = $state<string | null>(null);

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
				data.events = data.events.map(e =>
					e.id === eventId ? { ...e, attendanceStatus: 'checked-in' as const } : e,
				);
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

	// Authenticated user mark as not coming
	async function handleNotComing(eventId: string) {
		markingNotComing = eventId;
		checkInError = null;

		try {
			const response = await fetch('/api/checkin/not-coming', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ eventId }),
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Update the event in the list to show as not coming
				data.events = data.events.map(e =>
					e.id === eventId ? { ...e, attendanceStatus: 'not-coming' as const } : e,
				);
			}
			else if (result.error?.includes('already has an attendance record')) {
				// User already has a record - update UI to show as checked in
				data.events = data.events.map(e =>
					e.id === eventId ? { ...e, attendanceStatus: 'checked-in' as const } : e,
				);
				checkInError = 'You already have an attendance record for this event.';
			}
			else {
				checkInError = result.error || 'Failed to mark as not coming';
			}
		}
		catch {
			checkInError = 'Network error. Please try again.';
		}
		finally {
			markingNotComing = null;
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

<main>
	{#if data.authenticated}
		<!-- Authenticated user view -->
		<header class="page-header">
			<div class="header-content">
				<h1>Check In</h1>
				<p class="welcome-text">Welcome back!</p>
			</div>
			<div class="user-info">
				{#if data.user?.name}
					<span class="user-name">{data.user.name}</span>
				{/if}
				<span class="user-email">{data.user?.email}</span>
			</div>
		</header>

		{#if data.events.length === 0}
			<div class="empty-state">
				<p>No events available for check-in right now.</p>
			</div>
		{:else}
			<div class="events-list">
				{#each data.events as event (event.id)}
					{@const timeStatus = getTimeStatus(event.dateTime)}
					<div class="event-card" class:checked-in={event.attendanceStatus === 'checked-in'} class:not-coming={event.attendanceStatus === 'not-coming'}>
						<div class="event-info">
							<h2>{event.name}</h2>
							<p class="event-time">{formatDate(event.dateTime)}</p>
							<div class="event-meta">
								<span class="event-type">{event.eventType}</span>
								{#if event.expectedCount > 0}
									<span class="attendance-badge">
										{event.attendanceCount}/{event.expectedCount}
									</span>
								{:else if event.attendanceCount > 0}
									<span class="attendance-badge">
										{event.attendanceCount} checked in
									</span>
								{/if}
							</div>
							{#if event.attendanceStatus === 'none'}
								<p
									class="countdown"
									class:late={timeStatus.isLate}
									class:starting-soon={timeStatus.isStartingSoon}
								>
									{timeStatus.text}
								</p>
							{/if}
						</div>
						<div class="event-action">
							{#if event.attendanceStatus === 'checked-in'}
								<span class="checked-badge">Checked In</span>
							{:else if event.attendanceStatus === 'not-coming'}
								<span class="not-coming-badge">Not Coming</span>
								{#if timeStatus.canCheckIn}
									<button class="change-mind-btn" onclick={() => handleCheckIn(event.id)} disabled={checkingIn === event.id}>
										{checkingIn === event.id ? 'Checking in...' : 'Check In Instead'}
									</button>
								{/if}
							{:else if checkingIn === event.id || markingNotComing === event.id}
								<button disabled>{checkingIn === event.id ? 'Checking in...' : 'Marking...'}</button>
							{:else if !timeStatus.canCheckIn}
								<button class="disabled-future" disabled title="Check-in opens on the day of the event">
									Check In
								</button>
							{:else}
								<div class="action-buttons">
									<button onclick={() => handleCheckIn(event.id)} disabled={checkingIn !== null || markingNotComing !== null}>
										Check In
									</button>
									{#if data.checkInMethod === 'apprentice'}
										<button class="not-coming-btn" onclick={() => handleNotComing(event.id)} disabled={checkingIn !== null || markingNotComing !== null}>
											Not Coming
										</button>
									{/if}
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			{#if checkInError}
				<p class="error">{checkInError}</p>
			{/if}
		{/if}

	{:else}
		<!-- Guest check-in view -->
		<header class="page-header guest">
			<h1>Guest Check In</h1>
			<p class="welcome-text">Check in to an event as a guest</p>
		</header>
		<div class="guest-checkin">
			{#if guestStep === 'code'}
				<p class="instructions">Enter the 4-digit event code displayed at the venue.</p>
				<form onsubmit={handleCodeSubmit}>
					<label for="code">Event Code</label>
					<input
						type="text"
						id="code"
						bind:value={guestCode}
						placeholder="1234"
						maxlength="4"
						inputmode="numeric"
						autocomplete="off"
						disabled={guestLoading}
					/>
					<button type="submit" disabled={guestLoading || guestCode.length !== 4}>
						{guestLoading ? 'Validating...' : 'Continue'}
					</button>
				</form>

				{#if guestError}
					<p class="error">{guestError}</p>
				{/if}

				<p class="login-prompt">
					Have an account?
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- static path -->
					<button class="link-button" onclick={() => goto('/login?redirect=/checkin')}>
						Log in
					</button>
					for easier check-in.
				</p>

			{:else if guestStep === 'events'}
				<p class="instructions">Select the event you want to check in to:</p>

				<div class="events-list">
					{#each guestEvents as event (event.id)}
						{@const timeStatus = getTimeStatus(event.dateTime)}
						<div class="event-card">
							<div class="event-info">
								<h2>{event.name}</h2>
								<p class="event-time">{formatDate(event.dateTime)}</p>
								<div class="event-meta">
									<span class="event-type">{event.eventType}</span>
									{#if event.attendanceCount > 0}
										<span class="attendance-badge">
											{event.attendanceCount} checked in
										</span>
									{/if}
								</div>
								<p
									class="countdown"
									class:late={timeStatus.isLate}
									class:starting-soon={timeStatus.isStartingSoon}
								>
									{timeStatus.text}
								</p>
							</div>
							<div class="event-action">
								{#if !timeStatus.canCheckIn}
									<button class="disabled-future" disabled title="Check-in opens on the day of the event">
										Check In
									</button>
								{:else}
									<button onclick={() => selectGuestEvent(event)}>
										Check In
									</button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<button class="link-button" onclick={resetGuestForm}>
					Use a different code
				</button>

			{:else if guestStep === 'details'}
				{@const guestTimeStatus = guestSelectedEvent ? getTimeStatus(guestSelectedEvent.dateTime) : null}
				<div class="event-preview">
					<h2>{guestSelectedEvent?.name}</h2>
					<p>{guestSelectedEvent ? formatDate(guestSelectedEvent.dateTime) : ''}</p>
					{#if guestTimeStatus}
						<p
							class="countdown"
							class:late={guestTimeStatus.isLate}
							class:starting-soon={guestTimeStatus.isStartingSoon}
						>
							{guestTimeStatus.text}
						</p>
					{/if}
				</div>

				<form onsubmit={handleGuestCheckIn}>
					<label for="name">Your Name</label>
					<input
						type="text"
						id="name"
						bind:value={guestName}
						placeholder="Full name"
						required
						disabled={guestLoading}
					/>

					<label for="email">Email Address</label>
					<input
						type="email"
						id="email"
						bind:value={guestEmail}
						placeholder="you@example.com"
						required
						disabled={guestLoading}
					/>

					<button type="submit" disabled={guestLoading}>
						{guestLoading ? 'Checking in...' : 'Check In'}
					</button>
				</form>

				{#if guestError}
					<p class="error">{guestError}</p>
				{/if}

				<button class="link-button" onclick={backToEventSelection}>
					Select a different event
				</button>

			{:else if guestStep === 'success'}
				<div class="success">
					<h2>You're checked in!</h2>
					<p>Welcome to <strong>{guestSelectedEvent?.name}</strong></p>
				</div>
				<button onclick={resetGuestForm}>Check in to another event</button>
			{/if}
		</div>
	{/if}
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: 1rem;
	}

	/* Page header styles */
	.page-header {
		background: linear-gradient(135deg, #0066cc 0%, #004499 100%);
		color: white;
		padding: 1.5rem;
		border-radius: 12px;
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.page-header.guest {
		display: block;
		text-align: center;
		background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
	}

	.page-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.welcome-text {
		margin: 0.25rem 0 0 0;
		opacity: 0.9;
		font-size: 0.9rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		text-align: right;
	}

	.user-name {
		font-weight: 600;
		font-size: 1rem;
	}

	.user-email {
		font-size: 0.85rem;
		opacity: 0.85;
	}

	/* Event list styles */
	.events-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.event-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 8px;
		background: white;
	}

	.event-card.checked-in {
		background: #f0f9f0;
		border-color: #34a853;
	}

	.event-card.not-coming {
		background: #fff8f0;
		border-color: #ff9800;
	}

	.event-info h2 {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
	}

	.event-time {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
	}

	.event-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.event-type {
		color: #888;
		font-size: 0.8rem;
	}

	.attendance-badge {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.5rem;
		background: #f0f0f0;
		color: #555;
		font-size: 0.75rem;
		font-weight: 500;
		border-radius: 12px;
	}

	.countdown {
		margin: 0.5rem 0 0 0;
		padding: 0.25rem 0.5rem;
		background: #e8f4fd;
		color: #0066cc;
		font-size: 0.85rem;
		font-weight: 500;
		border-radius: 4px;
		display: inline-block;
		font-variant-numeric: tabular-nums;
	}

	.countdown.starting-soon {
		background: #fff3e0;
		color: #e65100;
	}

	.countdown.late {
		background: #ffebee;
		color: #c62828;
	}

	.event-action button {
		padding: 0.75rem 1.5rem;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	.event-action button:hover:not(:disabled) {
		background: #0052a3;
	}

	.event-action button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.action-buttons button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.event-action button.disabled-future {
		background: #ccc;
		color: #666;
		opacity: 1;
	}

	.checked-badge {
		padding: 0.5rem 1rem;
		background: #34a853;
		color: white;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.not-coming-badge {
		padding: 0.5rem 1rem;
		background: #ff9800;
		color: white;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.not-coming-btn {
		padding: 0.5rem 1rem;
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.not-coming-btn:hover:not(:disabled) {
		background: #c82333;
	}

	.not-coming-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.change-mind-btn {
		margin-top: 0.5rem;
		padding: 0.5rem 1rem;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.change-mind-btn:hover:not(:disabled) {
		background: #0052a3;
	}

	.change-mind-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Guest check-in styles */
	.guest-checkin {
		width: 100%;
	}

	.guest-checkin form {
		max-width: 400px;
		margin: 0 auto;
	}

	.guest-checkin .event-preview {
		max-width: 400px;
		margin: 0 auto 1.5rem auto;
	}

	.guest-checkin .success {
		max-width: 400px;
		margin: 0 auto 1rem auto;
	}

	.guest-checkin > button:not(.link-button) {
		display: block;
		max-width: 400px;
		width: 100%;
		margin: 0 auto;
	}

	.instructions {
		margin-bottom: 1.5rem;
		color: #666;
		text-align: center;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		font-weight: 500;
	}

	input {
		padding: 0.75rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 1rem;
	}

	input:focus {
		outline: 2px solid #0066cc;
		outline-offset: 1px;
	}

	input#code {
		font-size: 1.5rem;
		text-align: center;
		letter-spacing: 0.5rem;
	}

	button[type="submit"] {
		padding: 0.75rem 1.5rem;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	button[type="submit"]:hover:not(:disabled) {
		background: #0052a3;
	}

	button[type="submit"]:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.link-button {
		background: none;
		border: none;
		color: #0066cc;
		cursor: pointer;
		padding: 0.5rem;
		margin-top: 1rem;
	}

	.guest-checkin > .link-button {
		display: block;
		text-align: center;
		width: 100%;
	}

	.link-button:hover {
		text-decoration: underline;
	}

	.event-preview {
		background: #f5f5f5;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.event-preview h2 {
		margin: 0 0 0.25rem 0;
	}

	.event-preview p {
		margin: 0;
		color: #666;
	}

	/* States */
	.empty-state {
		text-align: center;
		padding: 2rem;
		color: #666;
	}

	.error {
		color: #cc0000;
		margin-top: 1rem;
	}

	.success {
		background: #e6f4ea;
		border: 1px solid #34a853;
		padding: 1.5rem;
		border-radius: 8px;
		text-align: center;
		margin-bottom: 1rem;
	}

	.success h2 {
		margin: 0 0 0.5rem 0;
		color: #1e7e34;
	}

	.success p {
		margin: 0;
	}

	.login-prompt {
		margin-top: 2rem;
		color: #666;
		font-size: 0.9rem;
		text-align: center;
	}

	.login-prompt .link-button {
		display: inline;
		padding: 0;
		margin: 0;
		font-size: inherit;
	}
</style>
