<script lang="ts">
	import type { ApprenticeAttendanceStats } from '$lib/types/attendance';
	import { STATUS_STYLES } from '$lib/types/attendance';

	interface Props {
		apprentice: ApprenticeAttendanceStats;
	}

	let { apprentice }: Props = $props();

	const LOW_ATTENDANCE_THRESHOLD = 80;

	function isLowAttendance(rate: number): boolean {
		return rate < LOW_ATTENDANCE_THRESHOLD;
	}

	function getAttendanceColor(rate: number): string {
		if (rate >= 90) return 'text-green-600';
		if (rate >= 80) return 'text-yellow-600';
		return 'text-red-600';
	}
</script>

<div
	class="p-6 bg-white border border-gray-200 rounded-xl shadow-sm"
	class:border-red-300={isLowAttendance(apprentice.attendanceRate)}
	class:bg-red-50={isLowAttendance(apprentice.attendanceRate)}
>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-lg font-semibold">Attendance Stats</h2>
		<div class="flex items-center gap-1">
			<span class="text-2xl font-bold {getAttendanceColor(apprentice.attendanceRate)}">
				{apprentice.attendanceRate.toFixed(0)}%
			</span>
			{#if isLowAttendance(apprentice.attendanceRate)}
				<span class="text-red-500" title="Low attendance">⚠</span>
			{/if}
		</div>
	</div>

	<div class="flex gap-3 text-center text-sm">
		<!-- Attended group: Present + Late -->
		<div class="flex-1 border-4 border-indigo-300 rounded-lg overflow-hidden bg-indigo-50/30">
			<div class="grid grid-cols-2">
				<div class="{STATUS_STYLES['Present'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Present'].text}">{apprentice.present}</div>
					<div class="text-gray-500 text-xs">Present</div>
				</div>
				<div class="{STATUS_STYLES['Late'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Late'].text}">{apprentice.late}</div>
					<div class="text-gray-500 text-xs">Late</div>
				</div>
			</div>
			<div class="bg-indigo-100 p-2">
				<div class="font-semibold text-indigo-600">{apprentice.attended}</div>
				<div class="text-gray-500 text-xs">Attended</div>
			</div>
		</div>

		<!-- Excused (standalone) -->
		<div class="{STATUS_STYLES['Excused'].bg} rounded-lg p-2 flex flex-col justify-center">
			<div class="font-semibold {STATUS_STYLES['Excused'].text}">{apprentice.excused}</div>
			<div class="text-gray-500 text-xs">Excused</div>
		</div>

		<!-- Missed group: Not Check-in + Absent -->
		<div class="flex-1 border-4 border-rose-300 rounded-lg overflow-hidden bg-rose-50/30">
			<div class="grid grid-cols-2">
				<div class="{STATUS_STYLES['Not Check-in'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Not Check-in'].text}">{apprentice.absent}</div>
					<div class="text-gray-500 text-xs">Not Check-in</div>
				</div>
				<div class="{STATUS_STYLES['Absent'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Absent'].text}">{apprentice.notComing}</div>
					<div class="text-gray-500 text-xs">Absent</div>
				</div>
			</div>
			<div class="bg-rose-100 p-2">
				<div class="font-semibold text-rose-600">{apprentice.absent + apprentice.notComing}</div>
				<div class="text-gray-500 text-xs">Missed</div>
			</div>
		</div>
	</div>
</div>
