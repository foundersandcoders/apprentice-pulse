<script lang="ts">
	import { resolve } from '$app/paths';
	let { data } = $props();
</script>

<div class="p-6 max-w-4xl mx-auto">
	<header class="mb-6">
		<a href={resolve('/')} class="text-blue-600 hover:underline text-sm">← Back to Home</a>
		<h1 class="text-2xl font-bold mt-2">Admin Dashboard</h1>
		<p class="text-gray-600 mt-1">Welcome, {data.user?.email}</p>
	</header>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<a
			href={resolve('/admin/events')}
			class="block p-6 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
		>
			<h2 class="text-lg font-semibold mb-2">Events</h2>
			<p class="text-gray-600 text-sm">Create, edit, and manage events for cohorts</p>
		</a>
	</div>
</div>
