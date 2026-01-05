<script lang="ts">
	import { DatePicker as SvelteDatePicker } from '@svelte-plugins/datepicker';
	import { format } from 'date-fns';

	interface Props {
		value: string; // YYYY-MM-DD format
		onchange?: (value: string) => void;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
	}

	let { value = $bindable(), onchange, placeholder = 'Select date', required = false, disabled = false }: Props = $props();

	let isOpen = $state(false);
	let startDate = $state<Date | null>(null);
	let lastSyncedValue = $state('');

	// Sync value -> startDate (external changes)
	$effect(() => {
		if (value !== lastSyncedValue) {
			if (value) {
				try {
					// Parse YYYY-MM-DD format
					const [year, month, day] = value.split('-').map(Number);
					const date = new Date(year, month - 1, day);
					if (!isNaN(date.getTime())) {
						startDate = date;
					}
				}
				catch {
					startDate = null;
				}
			}
			else {
				startDate = null;
			}
			lastSyncedValue = value;
		}
	});

	// Format for display
	let formattedDate = $derived(
		startDate ? format(startDate, 'dd/MM/yyyy') : '',
	);

	// Sync startDate -> value (picker changes)
	$effect(() => {
		if (startDate) {
			const newValue = format(startDate, 'yyyy-MM-dd');
			if (newValue !== lastSyncedValue) {
				value = newValue;
				lastSyncedValue = newValue;
				onchange?.(newValue);
			}
		}
	});
</script>

<div class="picker-field">
	<SvelteDatePicker
		bind:isOpen
		bind:startDate
		showTimePicker={false}
		enableFutureDates={true}
		enablePastDates={true}
	>
		<input
			type="text"
			{placeholder}
			{required}
			{disabled}
			value={formattedDate}
			class="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 focus:outline-none focus:ring-0"
			readonly
			onclick={() => !disabled && (isOpen = true)}
		/>
	</SvelteDatePicker>
</div>

<style>
	.picker-field {
		position: relative;
	}

	/* The datepicker wrapper should not have any styling */
	.picker-field :global(.datepicker) {
		border: none !important;
		background: transparent !important;
		box-shadow: none !important;
	}

	/* Position the calendar popup */
	.picker-field :global(.calendars-container) {
		position: absolute !important;
		top: 100% !important;
		left: 0 !important;
		z-index: 9999 !important;
		margin-top: 4px !important;
	}

	/* Style the calendar popup when shown */
	.picker-field :global(.calendars-container.show) {
		border: 2px solid #3b82f6 !important;
		border-radius: 8px !important;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
		background: white !important;
	}

	.picker-field :global(.datepicker .calendar) {
		background: white !important;
	}
</style>
