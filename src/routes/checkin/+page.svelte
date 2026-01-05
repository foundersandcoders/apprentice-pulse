<script lang="ts">
	import { goto } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Check-in state for authenticated users
	let checkingIn = $state<string | null>(null);
	let checkInError = $state<string | null>(null);

	// Guest check-in state
	let guestStep = $state<'code' | 'details' | 'success'>('code');
	let guestCode = $state('');
	let guestName = $state('');
	let guestEmail = $state('');
	let guestEvent = $state<{ id: string; name: string; dateTime: string } | null>(null);
	let guestError = $state('');
	let guestLoading = $state(false);

	// Live countdown timer
	let now = $state(Date.now());
	const timerInterval = setInterval(() => {
		now = Date.now();
	}, 1000);
	onDestroy(() => clearInterval(timerInterval));

	// Calculate countdown/late status for an event
	function getTimeStatus(dateTime: string): { text: string; isLate: boolean; isStartingSoon: boolean } {
		const eventTime = new Date(dateTime).getTime();
		const diff = eventTime - now;
		const absDiff = Math.abs(diff);

		const hours = Math.floor(absDiff / (1000 * 60 * 60));
		const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);

		if (diff > 0) {
			// Event hasn't started yet
			let text = 'Starts in ';
			if (hours > 0) text += `${hours}h `;
			if (hours > 0 || minutes > 0) text += `${minutes}m `;
			text += `${seconds}s`;
			return { text, isLate: false, isStartingSoon: diff < 10 * 60 * 1000 }; // < 10 min
		}
		else {
			// Event has started - user is late
			let text = '';
			if (hours > 0) text += `${hours}h `;
			if (hours > 0 || minutes > 0) text += `${minutes}m `;
			if (hours === 0) text += `${seconds}s `;
			text += 'late';
			return { text, isLate: true, isStartingSoon: false };
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
					e.id === eventId ? { ...e, alreadyCheckedIn: true } : e,
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

			if (result.valid && result.event) {
				guestEvent = result.event;
				guestStep = 'details';
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
					eventId: guestEvent?.id,
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
		guestEvent = null;
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
					<div class="event-card" class:checked-in={event.alreadyCheckedIn}>
						<div class="event-info">
							<h2>{event.name}</h2>
							<p class="event-time">{formatDate(event.dateTime)}</p>
							<p class="event-type">{event.eventType}</p>
							{#if !event.alreadyCheckedIn}
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
							{#if event.alreadyCheckedIn}
								<span class="checked-badge">Checked In</span>
							{:else if checkingIn === event.id}
								<button disabled>Checking in...</button>
							{:else}
								<button onclick={() => handleCheckIn(event.id)}>
									Check In
								</button>
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

			{:else if guestStep === 'details'}
				{@const guestTimeStatus = guestEvent ? getTimeStatus(guestEvent.dateTime) : null}
				<div class="event-preview">
					<h2>{guestEvent?.name}</h2>
					<p>{guestEvent ? formatDate(guestEvent.dateTime) : ''}</p>
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

				<button class="link-button" onclick={resetGuestForm}>
					Use a different code
				</button>

			{:else if guestStep === 'success'}
				<div class="success">
					<h2>You're checked in!</h2>
					<p>Welcome to <strong>{guestEvent?.name}</strong></p>
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

	.event-info h2 {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
	}

	.event-time {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
	}

	.event-type {
		margin: 0.25rem 0 0 0;
		color: #888;
		font-size: 0.8rem;
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

	.checked-badge {
		padding: 0.5rem 1rem;
		background: #34a853;
		color: white;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	/* Guest check-in styles */
	.guest-checkin {
		max-width: 400px;
	}

	.instructions {
		margin-bottom: 1.5rem;
		color: #666;
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
	}

	.login-prompt .link-button {
		display: inline;
		padding: 0;
		margin: 0;
		font-size: inherit;
	}
</style>
