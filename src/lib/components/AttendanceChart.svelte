<script lang="ts">
	import { Chart, registerables } from 'chart.js';

	Chart.register(...registerables);

	export interface ChartDataPoint {
		month: string;
		percentage: number;
		latenessPercentage?: number;
	}

	interface Props {
		data: ChartDataPoint[];
		title?: string;
	}

	let { data, title = 'Attendance Trend' }: Props = $props();

	// Check if we have lateness data to display
	const hasLatenessData = $derived(data.some(d => (d.latenessPercentage ?? 0) > 0));

	let canvas = $state<HTMLCanvasElement | null>(null);
	// Not using $state for chart to avoid effect loop - only needed for cleanup reference
	let chartInstance: Chart | null = null;

	$effect(() => {
		if (!canvas) return;

		// Destroy existing chart if any
		if (chartInstance) {
			chartInstance.destroy();
			chartInstance = null;
		}

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// Build datasets - always include attendance, conditionally include lateness
		const datasets = [
			{
				label: 'Attendance',
				data: data.map(d => d.percentage),
				borderColor: 'rgb(79, 70, 229)',
				backgroundColor: 'rgba(79, 70, 229, 0.1)',
				borderWidth: 2,
				fill: true,
				tension: 0.3,
				pointBackgroundColor: 'rgb(79, 70, 229)',
				pointBorderColor: '#fff',
				pointBorderWidth: 2,
				pointRadius: 4,
				pointHoverRadius: 6,
			},
		];

		// Add lateness dataset if there's data
		if (hasLatenessData) {
			datasets.push({
				label: 'Lateness',
				data: data.map(d => d.latenessPercentage ?? 0),
				borderColor: 'rgb(234, 179, 8)',
				backgroundColor: 'rgba(234, 179, 8, 0.1)',
				borderWidth: 2,
				fill: false,
				tension: 0.3,
				pointBackgroundColor: 'rgb(234, 179, 8)',
				pointBorderColor: '#fff',
				pointBorderWidth: 2,
				pointRadius: 4,
				pointHoverRadius: 6,
			});
		}

		chartInstance = new Chart(ctx, {
			type: 'line',
			data: {
				labels: data.map(d => d.month),
				datasets,
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						display: hasLatenessData,
						position: 'top' as const,
						labels: {
							usePointStyle: true,
							padding: 20,
						},
					},
					tooltip: {
						backgroundColor: 'rgba(0, 0, 0, 0.8)',
						titleFont: { size: 13 },
						bodyFont: { size: 12 },
						padding: 10,
						cornerRadius: 8,
						callbacks: {
							label: context => `${context.dataset.label}: ${context.parsed.y?.toFixed(1) ?? 0}%`,
						},
					},
				},
				scales: {
					y: {
						min: 0,
						max: 100,
						ticks: {
							callback: value => `${value}%`,
							stepSize: 20,
						},
						grid: {
							color: 'rgba(0, 0, 0, 0.05)',
						},
					},
					x: {
						grid: {
							display: false,
						},
					},
				},
				interaction: {
					intersect: false,
					mode: 'index',
				},
			},
		});

		return () => {
			if (chartInstance) {
				chartInstance.destroy();
				chartInstance = null;
			}
		};
	});
</script>

<div class="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
	<h2 class="text-lg font-semibold mb-4">{title}</h2>

	{#if data.length === 0}
		<div class="text-center py-8 text-gray-500">
			<p>No data available for chart</p>
		</div>
	{:else if data.length === 1}
		<div class="text-center py-8 text-gray-500">
			<p>Not enough data points to show trend</p>
			<p class="text-sm mt-1">Attendance for {data[0].month}: {data[0].percentage.toFixed(1)}%</p>
		</div>
	{:else}
		<div class="h-64">
			<canvas bind:this={canvas}></canvas>
		</div>
	{/if}
</div>
