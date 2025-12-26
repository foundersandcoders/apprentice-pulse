<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>

<h1>Apprentice Pulse</h1>

{#if data.user}
	<p>Logged in as: {data.user.email} ({data.user.type})</p>
	<a href={resolve('/api/auth/logout')}>Logout</a>
{:else}
	<p>Not logged in</p>
{/if}
