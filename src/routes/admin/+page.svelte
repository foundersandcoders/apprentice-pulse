<script lang="ts">
	import { resolve } from '$app/paths';
	import SearchApprentice from '$lib/components/SearchApprentice.svelte';
	let { data } = $props();
</script>

<div class="p-6 max-w-4xl mx-auto">
	<header class="mb-6 flex justify-between items-start">
		<div>
			<h1 class="text-2xl font-bold">
				{data.user?.type === 'external' ? 'Attendance Dashboard' : 'Admin Dashboard'}
			</h1>
			<div class="flex items-center gap-3 mt-1">
				<p class="text-gray-600">Welcome, {data.user?.email}</p>
				{#if data.user?.type === 'external'}
					<span class="inline-block px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
						External Access
					</span>
				{:else if data.user?.type === 'staff'}
					<span class="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
						Staff
					</span>
				{/if}
			</div>
		</div>
		<div class="flex gap-4 text-sm">
			{#if data.user?.type !== 'external'}
				<a href={resolve('/checkin')} class="text-blue-600 hover:underline">Check In</a>
			{/if}
			<a href={resolve('/api/auth/logout')} class="text-gray-500 hover:text-gray-700">Logout</a>
		</div>
	</header>

	<div class="grid gap-6 sm:grid-cols-2">
		{#if data.user?.type !== 'external'}
			<a
				href={resolve('/admin/events')}
				class="group block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-blue-300 transition-all"
			>
				<div class="flex items-start gap-4">
					<div class="shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl group-hover:bg-blue-200 transition-colors">
						📅
					</div>
					<div>
						<h2 class="text-lg font-semibold mb-1 group-hover:text-blue-600 transition-colors">Events</h2>
						<p class="text-gray-600 text-sm">Create, edit, and manage events for cohorts</p>
					</div>
				</div>
			</a>
		{/if}
		<a
			href={resolve('/admin/attendance')}
			class="group block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-green-300 transition-all"
		>
			<div class="flex items-start gap-4">
				<div class="shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl group-hover:bg-green-200 transition-colors">
					✓
				</div>
				<div>
					<h2 class="text-lg font-semibold mb-1 group-hover:text-green-600 transition-colors">Attendance</h2>
					<p class="text-gray-600 text-sm">Track cohorts attendance rates and history</p>
				</div>
			</div>
		</a>
		<div
			class="group block p-6 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg hover:border-purple-300 transition-all"
		>
			<div class="flex items-start gap-4 mb-4">
				<div class="shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl group-hover:bg-purple-200 transition-colors">
					🔍
				</div>
				<div class="flex-1">
					<h2 class="text-lg font-semibold mb-1 group-hover:text-purple-600 transition-colors">Search Apprentice</h2>
					<p class="text-gray-600 text-sm">Find and view apprentice details</p>
				</div>
			</div>
			<SearchApprentice />
		</div>
	</div>
</div>
