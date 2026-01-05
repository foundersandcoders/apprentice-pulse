<script lang="ts">
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { format } from 'date-fns';

	interface Props {
		value: string; // ISO string or datetime-local format
		onchange?: (value: string) => void;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
	}

	let { value = $bindable(), onchange, placeholder = 'Select date/time', required = false, disabled = false }: Props = $props();

	let isOpen = $state(false);
	let startDate = $state<Date | null>(null);
	let startDateTime = $state('10:00'); // HH:mm format for time picker
	let lastSyncedValue = $state('');

	// Sync value -> startDate and startDateTime (external changes)
	$effect(() => {
		if (value !== lastSyncedValue) {
			if (value) {
				try {
					const date = new Date(value);
					if (!isNaN(date.getTime())) {
						startDate = date;
						// Extract time in HH:mm format
						const hours = String(date.getHours()).padStart(2, '0');
						const minutes = String(date.getMinutes()).padStart(2, '0');
						startDateTime = `${hours}:${minutes}`;
					}
				}
				catch {
					startDate = null;
					startDateTime = '10:00';
				}
			}
			else {
				startDate = null;
				startDateTime = '10:00';
			}
			lastSyncedValue = value;
		}
	});

	// Format for display
	let formattedDate = $derived(
		startDate ? format(startDate, 'dd/MM/yyyy HH:mm') : '',
	);

	// Sync startDate -> value (picker changes)
	$effect(() => {
		if (startDate) {
			const newValue = format(startDate, 'yyyy-MM-dd\'T\'HH:mm');
			if (newValue !== lastSyncedValue) {
				value = newValue;
				lastSyncedValue = newValue;
				onchange?.(newValue);
			}
		}
	});
</script>

<div class="picker-field">
	<DatePicker
		bind:isOpen
		bind:startDate
		bind:startDateTime
		showTimePicker={true}
		enableFutureDates={true}
		enablePastDates={true}
	>
		<input
			type="text"
			{placeholder}
			{required}
			{disabled}
			value={formattedDate}
			class="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
			readonly
			onclick={() => !disabled && (isOpen = true)}
		/>
	</DatePicker>
</div>

<style>
	.picker-field {
		position: relative;
	}

	/* The datepicker library wraps the popup - make it not affect layout */
	.picker-field :global(.datepicker-wrapper) {
		position: absolute !important;
		top: 100% !important;
		left: 0 !important;
		z-index: 9999 !important;
		margin-top: 4px !important;
	}

	/* Style the datepicker popup */
	.picker-field :global(.datepicker) {
		border: 2px solid #3b82f6 !important;
		border-radius: 8px !important;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
		background: white !important;
	}

	.picker-field :global(.datepicker .calendar) {
		background: white !important;
	}

	.picker-field :global(.datepicker .time-picker) {
		border-top: 1px solid #e5e7eb !important;
	}
</style>
