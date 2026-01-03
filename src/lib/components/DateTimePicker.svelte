<script lang="ts">
	import { DatePicker } from '@svelte-plugins/datepicker';
	import { format } from 'date-fns';

	interface Props {
		value: string; // ISO string or datetime-local format
		onchange?: (value: string) => void;
		placeholder?: string;
		required?: boolean;
	}

	let { value = $bindable(), onchange, placeholder = 'Select date/time', required = false }: Props = $props();

	let isOpen = $state(false);
	let startDate = $state<Date | null>(null);

	// Parse initial value
	$effect(() => {
		if (value) {
			try {
				// Handle both ISO and datetime-local formats
				const date = new Date(value);
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
	});

	// Format for display
	let formattedDate = $derived(
		startDate ? format(startDate, 'dd/MM/yyyy HH:mm') : '',
	);

	// Update value when date changes
	function handleDateChange() {
		if (startDate) {
			// Output in datetime-local format for consistency
			const newValue = format(startDate, 'yyyy-MM-dd\'T\'HH:mm');
			value = newValue;
			onchange?.(newValue);
		}
	}

	$effect(() => {
		if (startDate) {
			handleDateChange();
		}
	});
</script>

<div class="picker-field">
	<DatePicker
		bind:isOpen
		bind:startDate
		showTimePicker={true}
		enableFutureDates={true}
		enablePastDates={true}
	>
		<input
			type="text"
			{placeholder}
			{required}
			value={formattedDate}
			class="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white cursor-pointer"
			readonly
			onclick={() => isOpen = true}
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
