<script lang="ts">
	import type { CohortOverviewStats } from '$lib/types/attendance';
	import { STATUS_STYLES } from '$lib/types/attendance';

	interface Props {
		stats: CohortOverviewStats;
	}

	let { stats }: Props = $props();

	const LOW_ATTENDANCE_THRESHOLD = 80;

	function getAttendanceColor(rate: number): string {
		if (rate >= 90) return 'text-green-600';
		if (rate >= 80) return 'text-yellow-600';
		return 'text-red-600';
	}

	const hasAtRiskApprentices = $derived(stats.apprenticesAtRisk > 0);
</script>

<div
	class="p-6 bg-white border border-gray-200 rounded-xl shadow-sm"
	class:border-red-300={hasAtRiskApprentices}
	class:bg-red-50={hasAtRiskApprentices}
>
	<div class="flex justify-between items-center mb-4">
		<div>
			<h2 class="text-lg font-semibold">Attendance Stats</h2>
			<p class="text-sm text-gray-500">{stats.apprenticeCount} apprentice{stats.apprenticeCount !== 1 ? 's' : ''}</p>
		</div>
		<div class="flex items-center gap-2">
			<span class="text-2xl font-bold {getAttendanceColor(stats.attendanceRate)}">
				{stats.attendanceRate.toFixed(0)}%
			</span>
			{#if hasAtRiskApprentices}
				<span class="text-red-500" title="{stats.apprenticesAtRisk} apprentice{stats.apprenticesAtRisk !== 1 ? 's' : ''} below {LOW_ATTENDANCE_THRESHOLD}%">
					({stats.apprenticesAtRisk} at risk)
				</span>
			{/if}
		</div>
	</div>

	<div class="flex gap-3 text-center text-sm">
		<!-- Attended group: Present + Late -->
		<div class="flex-1 border-4 border-indigo-300 rounded-lg overflow-hidden bg-indigo-50/30">
			<div class="grid grid-cols-2">
				<div class="{STATUS_STYLES['Present'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Present'].text}">{stats.present}</div>
					<div class="text-gray-500 text-xs">Present</div>
				</div>
				<div class="{STATUS_STYLES['Late'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Late'].text}">{stats.late}</div>
					<div class="text-gray-500 text-xs">Late</div>
				</div>
			</div>
			<div class="bg-indigo-100 p-2">
				<div class="font-semibold text-indigo-600">{stats.attended}</div>
				<div class="text-gray-500 text-xs">Attended</div>
			</div>
		</div>

		<!-- Excused (standalone) -->
		<div class="{STATUS_STYLES['Excused'].bg} rounded-lg p-2 flex flex-col justify-center">
			<div class="font-semibold {STATUS_STYLES['Excused'].text}">{stats.excused}</div>
			<div class="text-gray-500 text-xs">Excused</div>
		</div>

		<!-- Missed group: Not Check-in + Absent -->
		<div class="flex-1 border-4 border-rose-300 rounded-lg overflow-hidden bg-rose-50/30">
			<div class="grid grid-cols-2">
				<div class="{STATUS_STYLES['Not Check-in'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Not Check-in'].text}">{stats.absent}</div>
					<div class="text-gray-500 text-xs">Not Check-in</div>
				</div>
				<div class="{STATUS_STYLES['Absent'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Absent'].text}">{stats.notComing}</div>
					<div class="text-gray-500 text-xs">Absent</div>
				</div>
			</div>
			<div class="bg-rose-100 p-2">
				<div class="font-semibold text-rose-600">{stats.absent + stats.notComing}</div>
				<div class="text-gray-500 text-xs">Missed</div>
			</div>
		</div>
	</div>
</div>
