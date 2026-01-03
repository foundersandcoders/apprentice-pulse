<script lang="ts">
	interface Props {
		value: string; // HH:mm format
		minTime?: string; // HH:mm format - times before this are disabled
		disabled?: boolean;
		onchange?: (value: string) => void;
	}

	let { value = $bindable(), minTime, disabled = false, onchange }: Props = $props();

	// Parse value into hours and minutes
	let hours = $derived(value ? value.split(':')[0] : '');
	let minutes = $derived(value ? value.split(':')[1] : '');

	// Parse minTime
	let minHour = $derived(minTime ? parseInt(minTime.split(':')[0], 10) : 0);
	let minMinute = $derived(minTime ? parseInt(minTime.split(':')[1], 10) : 0);

	// Current selected hour as number
	let selectedHour = $derived(hours ? parseInt(hours, 10) : -1);

	// Generate hour options (00-23)
	const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

	// Generate minute options (15-min increments: 00, 15, 30, 45)
	const minuteOptions = ['00', '15', '30', '45'];

	function isHourDisabled(hour: string): boolean {
		if (!minTime) return false;
		return parseInt(hour, 10) < minHour;
	}

	function isMinuteDisabled(minute: string): boolean {
		if (!minTime) return false;
		// Only disable minutes if we're on the same hour as minTime
		if (selectedHour > minHour) return false;
		if (selectedHour < minHour) return true;
		// Same hour - disable minutes before minMinute
		return parseInt(minute, 10) < minMinute;
	}

	// Find the next valid minute option >= target
	function getNextValidMinute(targetMinute: number): string {
		for (const min of minuteOptions) {
			if (parseInt(min, 10) >= targetMinute) return min;
		}
		return minuteOptions[0]; // Wrap to 00 if none found
	}

	function handleHourChange(e: Event) {
		const newHour = (e.target as HTMLSelectElement).value;
		let currentMinutes = minutes || '00';

		// Ensure current minutes is a valid option
		if (!minuteOptions.includes(currentMinutes)) {
			currentMinutes = getNextValidMinute(parseInt(currentMinutes, 10));
		}

		// If the new hour equals minHour and current minutes are less than minMinute, adjust
		if (minTime && parseInt(newHour, 10) === minHour && parseInt(currentMinutes, 10) < minMinute) {
			currentMinutes = getNextValidMinute(minMinute);
		}

		value = `${newHour}:${currentMinutes}`;
		onchange?.(value);
	}

	function handleMinuteChange(e: Event) {
		const newMinute = (e.target as HTMLSelectElement).value;
		const currentHours = hours || '00';
		value = `${currentHours}:${newMinute}`;
		onchange?.(value);
	}
</script>

<div class="flex items-center gap-0.5">
	<select
		value={hours}
		onchange={handleHourChange}
		{disabled}
		class="border border-gray-300 rounded px-1 py-1 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
	>
		<option value="" disabled>--</option>
		{#each hourOptions as hour (hour)}
			<option value={hour} disabled={isHourDisabled(hour)}>{hour}</option>
		{/each}
	</select>
	<span class="text-gray-400">:</span>
	<select
		value={minutes}
		onchange={handleMinuteChange}
		disabled={disabled || !hours}
		class="border border-gray-300 rounded px-1 py-1 text-sm bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
	>
		<option value="" disabled>--</option>
		{#each minuteOptions as minute (minute)}
			<option value={minute} disabled={isMinuteDisabled(minute)}>{minute}</option>
		{/each}
	</select>
</div>
