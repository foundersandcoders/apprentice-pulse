<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>

<h1>Apprentice Pulse</h1>

{#if data.user}
	<p>Logged in as: {data.user.email} ({data.user.type})</p>
	<nav>
		{#if data.user.type === 'staff'}
			<a href={resolve('/admin')}>Admin Dashboard</a>
		{/if}
		<a href={resolve('/api/auth/logout')}>Logout</a>
	</nav>
{:else}
	<p>Not logged in</p>
	<a href={resolve('/login')}>Login</a>
{/if}
