<script lang="ts">
	import type { AttendanceStats } from '$lib/types/attendance';
	import { STATUS_STYLES } from '$lib/types/attendance';

	interface Props {
		stats: AttendanceStats;
		title?: string;
		showLowAttendanceWarning?: boolean;
	}

	let { stats, title = 'Attendance Stats', showLowAttendanceWarning = false }: Props = $props();

	const LOW_ATTENDANCE_THRESHOLD = 80;

	function isLowAttendance(rate: number): boolean {
		return rate < LOW_ATTENDANCE_THRESHOLD;
	}

	function getAttendanceColor(rate: number): string {
		if (rate >= 90) return 'text-green-600';
		if (rate >= 80) return 'text-yellow-600';
		return 'text-red-600';
	}

	const latenessRate = $derived(stats.totalEvents > 0 ? (stats.late / stats.totalEvents) * 100 : 0);
</script>

<div
	class="p-6 bg-white border border-gray-200 rounded-xl shadow-sm"
	class:border-red-300={showLowAttendanceWarning && isLowAttendance(stats.attendanceRate)}
	class:bg-red-50={showLowAttendanceWarning && isLowAttendance(stats.attendanceRate)}
>
	<div class="flex justify-between items-center mb-4">
		<h2 class="text-lg font-semibold">{title}</h2>
		<div class="flex items-center gap-4 text-sm">
			<span>
				<span class="text-gray-600">Global Attendance:</span>
				<span class="font-semibold {getAttendanceColor(stats.attendanceRate)}">{stats.attendanceRate.toFixed(0)}%</span>
			</span>
			<span>
				<span class="text-gray-600">Global Lateness:</span>
				<span class="font-semibold text-yellow-600">{latenessRate.toFixed(0)}%</span>
			</span>
			{#if showLowAttendanceWarning && isLowAttendance(stats.attendanceRate)}
				<span class="text-red-500" title="Low attendance">⚠</span>
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
					<div class="text-xs text-green-600 font-medium">
						{stats.totalEvents > 0 ? ((stats.present / stats.totalEvents) * 100).toFixed(0) : 0}%
					</div>
				</div>
				<div class="{STATUS_STYLES['Late'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Late'].text}">{stats.late}</div>
					<div class="text-gray-500 text-xs">Late</div>
					<div class="text-xs text-yellow-600 font-medium">
						{stats.totalEvents > 0 ? ((stats.late / stats.totalEvents) * 100).toFixed(0) : 0}%
					</div>
				</div>
			</div>
			<div class="bg-indigo-100 p-2">
				<div class="font-semibold text-indigo-600">{stats.attended}</div>
				<div class="text-gray-500 text-xs">Attended</div>
				<div class="text-xs text-indigo-600 font-medium">
					{stats.totalEvents > 0 ? ((stats.attended / stats.totalEvents) * 100).toFixed(0) : 0}%
				</div>
			</div>
		</div>

		<!-- Excused (standalone) -->
		<div class="{STATUS_STYLES['Excused'].bg} rounded-lg p-2 flex flex-col justify-center">
			<div class="font-semibold {STATUS_STYLES['Excused'].text}">{stats.excused}</div>
			<div class="text-gray-500 text-xs">Excused</div>
			<div class="text-xs text-blue-600 font-medium">
				{stats.totalEvents > 0 ? ((stats.excused / stats.totalEvents) * 100).toFixed(0) : 0}%
			</div>
		</div>

		<!-- Missed group: Not Check-in + Absent -->
		<div class="flex-1 border-4 border-rose-300 rounded-lg overflow-hidden bg-rose-50/30">
			<div class="grid grid-cols-2">
				<div class="{STATUS_STYLES['Not Check-in'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Not Check-in'].text}">{stats.absent}</div>
					<div class="text-gray-500 text-xs">Not Check-in</div>
					<div class="text-xs text-red-600 font-medium">
						{stats.totalEvents > 0 ? ((stats.absent / stats.totalEvents) * 100).toFixed(0) : 0}%
					</div>
				</div>
				<div class="{STATUS_STYLES['Absent'].bg} p-2">
					<div class="font-semibold {STATUS_STYLES['Absent'].text}">{stats.notComing}</div>
					<div class="text-gray-500 text-xs">Absent</div>
					<div class="text-xs text-orange-600 font-medium">
						{stats.totalEvents > 0 ? ((stats.notComing / stats.totalEvents) * 100).toFixed(0) : 0}%
					</div>
				</div>
			</div>
			<div class="bg-rose-100 p-2">
				<div class="font-semibold text-rose-600">{stats.absent + stats.notComing}</div>
				<div class="text-gray-500 text-xs">Missed</div>
				<div class="text-xs text-rose-600 font-medium">
					{stats.totalEvents > 0 ? (((stats.absent + stats.notComing) / stats.totalEvents) * 100).toFixed(0) : 0}%
				</div>
			</div>
		</div>
	</div>
</div>
