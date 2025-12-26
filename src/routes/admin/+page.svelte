<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>

<h1>Admin Dashboard</h1>
<p>Welcome, {data.user?.email}</p>
<p>This page is only accessible to staff members.</p>
<a href={resolve('/')}>Back to home</a>
