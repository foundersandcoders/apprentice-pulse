<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';

	interface Props {
		selectedDates: Date[];
		onDateToggle: (date: Date) => void;
	}

	let { selectedDates, onDateToggle }: Props = $props();

	// Current displayed month
	let currentMonth = new SvelteDate();

	// Get today for disabling past dates (computed once on component init)
	const todayTime = Date.now();
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- not reactive, just initialization
	const todayStart = new Date(todayTime);
	todayStart.setHours(0, 0, 0, 0);
	const todayTimestamp = todayStart.getTime();

	/* eslint-disable svelte/prefer-svelte-reactivity -- pure computation functions use Date, not reactive */
	// Calculate days in month
	function getDaysInMonth(date: Date): { date: Date; isCurrentMonth: boolean }[] {
		const year = date.getFullYear();
		const month = date.getMonth();

		// First day of the month
		const firstDay = new Date(year, month, 1);
		// Last day of the month
		const lastDay = new Date(year, month + 1, 0);

		// Start from Monday of the week containing the first day
		const startDate = new Date(firstDay);
		const dayOfWeek = firstDay.getDay();
		// Adjust for Monday start (0 = Sunday, so we need to go back 6 days if Sunday, otherwise go back dayOfWeek - 1 days)
		const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
		startDate.setDate(startDate.getDate() - daysToSubtract);

		// End on Sunday of the week containing the last day
		const endDate = new Date(lastDay);
		const lastDayOfWeek = lastDay.getDay();
		const daysToAdd = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
		endDate.setDate(endDate.getDate() + daysToAdd);

		const days: { date: Date; isCurrentMonth: boolean }[] = [];
		const current = new Date(startDate);

		while (current <= endDate) {
			days.push({
				date: new Date(current),
				isCurrentMonth: current.getMonth() === month,
			});
			current.setDate(current.getDate() + 1);
		}

		return days;
	}

	// Check if date is in the past
	function isPast(date: Date): boolean {
		const checkDate = new Date(date);
		checkDate.setHours(0, 0, 0, 0);
		return checkDate.getTime() < todayTimestamp;
	}
	/* eslint-enable svelte/prefer-svelte-reactivity */

	// Check if a date is selected
	function isSelected(date: Date): boolean {
		return selectedDates.some(d =>
			d.getFullYear() === date.getFullYear()
			&& d.getMonth() === date.getMonth()
			&& d.getDate() === date.getDate(),
		);
	}

	// Navigate months
	function prevMonth() {
		currentMonth.setMonth(currentMonth.getMonth() - 1);
	}

	function nextMonth() {
		currentMonth.setMonth(currentMonth.getMonth() + 1);
	}

	// Format month header
	function formatMonthYear(date: Date): string {
		return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
	}

	// Days of week header
	const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

	// Derived: days for current month view
	let days = $derived(getDaysInMonth(currentMonth));
</script>

<div class="calendar-picker">
	<div class="calendar-header">
		<button type="button" class="nav-btn" onclick={prevMonth} aria-label="Previous month">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
				<path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
			</svg>
		</button>
		<span class="month-year">{formatMonthYear(currentMonth)}</span>
		<button type="button" class="nav-btn" onclick={nextMonth} aria-label="Next month">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="icon">
				<path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
			</svg>
		</button>
	</div>

	<div class="calendar-grid">
		{#each weekDays as day (day)}
			<div class="weekday-header">{day}</div>
		{/each}

		{#each days as { date, isCurrentMonth } (date.toISOString())}
			{@const past = isPast(date)}
			{@const selected = isSelected(date)}
			<button
				type="button"
				class="day-cell"
				class:other-month={!isCurrentMonth}
				class:past={past}
				class:selected={selected}
				disabled={past || !isCurrentMonth}
				onclick={() => onDateToggle(date)}
				aria-label={date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
				aria-pressed={selected}
			>
				{date.getDate()}
			</button>
		{/each}
	</div>
</div>

<style>
	.calendar-picker {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		width: fit-content;
	}

	.calendar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.month-year {
		font-weight: 600;
		font-size: 1rem;
	}

	.nav-btn {
		background: none;
		border: 1px solid #e5e7eb;
		border-radius: 4px;
		padding: 0.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.nav-btn:hover {
		background: #f3f4f6;
	}

	.icon {
		width: 1.25rem;
		height: 1.25rem;
	}

	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 2.5rem);
		gap: 2px;
	}

	.weekday-header {
		text-align: center;
		font-size: 0.75rem;
		font-weight: 500;
		color: #6b7280;
		padding: 0.5rem 0;
	}

	.day-cell {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		border: none;
		background: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.day-cell:hover:not(:disabled) {
		background: #f3f4f6;
	}

	.day-cell.other-month {
		color: #d1d5db;
	}

	.day-cell.past {
		color: #d1d5db;
		cursor: not-allowed;
	}

	.day-cell.selected {
		background: #2563eb;
		color: white;
	}

	.day-cell.selected:hover {
		background: #1d4ed8;
	}
</style>
