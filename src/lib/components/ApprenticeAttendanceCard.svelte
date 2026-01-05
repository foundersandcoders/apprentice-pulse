<script lang="ts">
	import type { ApprenticeAttendanceStats } from '$lib/types/attendance';

	interface Props {
		apprentice: ApprenticeAttendanceStats;
		onclick?: () => void;
	}

	let { apprentice, onclick }: Props = $props();

	const LOW_ATTENDANCE_THRESHOLD = 80;

	function isLowAttendance(rate: number): boolean {
		return rate < LOW_ATTENDANCE_THRESHOLD;
	}

	function getAttendanceColor(rate: number): string {
		if (rate >= 90) return 'text-green-600';
		if (rate >= 80) return 'text-yellow-600';
		return 'text-red-600';
	}

	function getTrendIcon(direction: 'up' | 'down' | 'stable'): string {
		switch (direction) {
			case 'up': return '↗';
			case 'down': return '↘';
			case 'stable': return '→';
		}
	}

	function getTrendColor(direction: 'up' | 'down' | 'stable'): string {
		switch (direction) {
			case 'up': return 'text-green-600';
			case 'down': return 'text-red-600';
			case 'stable': return 'text-gray-500';
		}
	}
</script>

<button
	class="block w-full text-left p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
	class:border-red-300={isLowAttendance(apprentice.attendanceRate)}
	class:bg-red-50={isLowAttendance(apprentice.attendanceRate)}
	onclick={onclick}
	disabled={!onclick}
>
	<div class="flex justify-between items-start mb-3">
		<div>
			<h3 class="font-semibold text-lg">{apprentice.apprenticeName}</h3>
			{#if apprentice.cohortName}
				<p class="text-sm text-gray-500">{apprentice.cohortName}</p>
			{/if}
		</div>
		<div class="text-right">
			<div class="flex items-center gap-1">
				<span class="text-2xl font-bold {getAttendanceColor(apprentice.attendanceRate)}">
					{apprentice.attendanceRate.toFixed(0)}%
				</span>
				{#if isLowAttendance(apprentice.attendanceRate)}
					<span class="text-red-500" title="Low attendance">⚠</span>
				{/if}
			</div>
			<span class="{getTrendColor(apprentice.trend.direction)} text-sm" title="{apprentice.trend.change > 0 ? '+' : ''}{apprentice.trend.change.toFixed(1)}%">
				{getTrendIcon(apprentice.trend.direction)} trend
			</span>
		</div>
	</div>

	<div class="grid grid-cols-4 gap-2 text-center text-sm">
		<div class="bg-gray-50 rounded p-2">
			<div class="font-semibold">{apprentice.attended}</div>
			<div class="text-gray-500 text-xs">Attended</div>
		</div>
		<div class="bg-green-50 rounded p-2">
			<div class="font-semibold text-green-600">{apprentice.present}</div>
			<div class="text-gray-500 text-xs">Present</div>
		</div>
		<div class="bg-yellow-50 rounded p-2">
			<div class="font-semibold text-yellow-600">{apprentice.late}</div>
			<div class="text-gray-500 text-xs">Late</div>
		</div>
		<div class="bg-red-50 rounded p-2">
			<div class="font-semibold text-red-600">{apprentice.absent}</div>
			<div class="text-gray-500 text-xs">Absent</div>
		</div>
	</div>

	<div class="mt-3 text-xs text-gray-500 text-right">
		{apprentice.attended} of {apprentice.totalEvents} events
	</div>
</button>
