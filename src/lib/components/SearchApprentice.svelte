<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	interface SearchResult {
		id: string;
		name: string;
		email: string;
		status: 'Active' | 'On Leave' | 'Off-boarded';
		cohortNumbers?: number[];
	}

	let searchQuery = $state('');
	let searchResults = $state<SearchResult[]>([]);
	let isSearching = $state(false);
	let showResults = $state(false);
	let selectedIndex = $state(-1);
	let searchInput = $state<HTMLInputElement | null>(null);
	let searchContainer = $state<HTMLDivElement | null>(null);
	let searchTimeout: ReturnType<typeof setTimeout>;

	// Debounced search function
	function handleSearch() {
		clearTimeout(searchTimeout);
		selectedIndex = -1;

		if (searchQuery.length < 2) {
			searchResults = [];
			showResults = false;
			return;
		}

		isSearching = true;
		showResults = true;

		searchTimeout = setTimeout(async () => {
			try {
				const response = await fetch(`/api/apprentices/search?q=${encodeURIComponent(searchQuery)}`);
				const data = await response.json();

				if (data.success) {
					searchResults = data.apprentices;
				}
				else {
					searchResults = [];
				}
			}
			catch (error) {
				console.error('Search failed:', error);
				searchResults = [];
			}
			finally {
				isSearching = false;
			}
		}, 300); // 300ms debounce
	}

	// Navigate to apprentice attendance detail with referrer
	function selectApprentice(apprentice: SearchResult) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- URL is constructed from dynamic id
		goto(`/admin/attendance/${apprentice.id}?from=search`);
	}

	// Keyboard navigation
	function handleKeydown(event: KeyboardEvent) {
		if (!showResults || searchResults.length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
					selectApprentice(searchResults[selectedIndex]);
				}
				break;
			case 'Escape':
				showResults = false;
				selectedIndex = -1;
				break;
		}
	}

	// Click outside to close
	function handleClickOutside(event: MouseEvent) {
		if (searchContainer && !searchContainer.contains(event.target as Node)) {
			showResults = false;
			selectedIndex = -1;
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	onDestroy(() => {
		clearTimeout(searchTimeout);
	});
</script>

<div bind:this={searchContainer} class="relative w-full">
	<div class="relative">
		<input
			bind:this={searchInput}
			type="text"
			bind:value={searchQuery}
			oninput={handleSearch}
			onkeydown={handleKeydown}
			onfocus={() => searchQuery.length >= 2 && (showResults = true)}
			placeholder="Search apprentices..."
			class="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
		/>
		<svg
			class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
	</div>

	{#if showResults}
		<div class="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
			{#if isSearching}
				<div class="p-4 text-center text-gray-500">
					<div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
					<span class="ml-2">Searching...</span>
				</div>
			{:else if searchResults.length > 0}
				<ul class="py-2">
					{#each searchResults as result, index (result.id)}
						<li>
							<button
								onclick={() => selectApprentice(result)}
								onmouseenter={() => selectedIndex = index}
								class="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors
									{selectedIndex === index ? 'bg-purple-50' : ''}"
							>
								<div class="font-medium text-gray-900">{result.name}</div>
								<div class="text-sm text-gray-500">{result.email}</div>
							</button>
						</li>
					{/each}
				</ul>
			{:else if searchQuery.length >= 2}
				<div class="p-4 text-center text-gray-500">
					No apprentices found matching "{searchQuery}"
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.animate-spin {
		animation: spin 1s linear infinite;
	}
</style>
