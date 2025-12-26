<script lang="ts">
	import { page } from '$app/state';

	let email = $state('');
	let status = $state<'idle' | 'loading' | 'success' | 'error'>('idle');
	let message = $state('');

	const redirectTo = $derived(page.url.searchParams.get('redirect') || '/admin');

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		status = 'loading';
		message = '';

		try {
			const response = await fetch('/api/auth/staff/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, redirect: redirectTo }),
			});

			const data = await response.json();

			if (response.ok) {
				status = 'success';
				message = data.message || 'Check your email for the magic link!';
			}
			else {
				status = 'error';
				message = data.error || 'Something went wrong. Please try again.';
			}
		}
		catch {
			status = 'error';
			message = 'Network error. Please try again.';
		}
	}
</script>

<svelte:head>
	<title>Staff Login - Apprentice Pulse</title>
</svelte:head>

<main>
	<h1>Staff Login</h1>

	{#if status === 'success'}
		<div class="success">
			<p>{message}</p>
			<p>The link will expire in 15 minutes.</p>
		</div>
	{:else}
		<form onsubmit={handleSubmit}>
			<label for="email">Staff email address</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				placeholder="you@foundersandcoders.com"
				required
				disabled={status === 'loading'}
			/>

			<button type="submit" disabled={status === 'loading'}>
				{status === 'loading' ? 'Sending...' : 'Send magic link'}
			</button>

			{#if status === 'error'}
				<p class="error">{message}</p>
			{/if}
		</form>

		<p class="help">
			Enter your staff email to access the admin dashboard.
		</p>
	{/if}
</main>

<style>
	main {
		max-width: 400px;
		margin: 2rem auto;
		padding: 1rem;
	}

	h1 {
		margin-bottom: 1.5rem;
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

	button {
		padding: 0.75rem 1.5rem;
		background: #0066cc;
		color: white;
		border: none;
		border-radius: 4px;
		font-size: 1rem;
		cursor: pointer;
	}

	button:hover:not(:disabled) {
		background: #0052a3;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error {
		color: #cc0000;
		margin: 0;
	}

	.success {
		background: #e6f4ea;
		border: 1px solid #34a853;
		padding: 1rem;
		border-radius: 4px;
	}

	.success p {
		margin: 0.5rem 0;
	}

	.help {
		margin-top: 1.5rem;
		color: #666;
		font-size: 0.9rem;
	}
</style>
