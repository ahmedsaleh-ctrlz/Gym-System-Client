import { Component, computed, input } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { AttendancePoint } from '../../models/adminDashboardResponse';
@Component({
  imports: [ChartModule],
  selector: 'app-attendance-chart',
  styleUrl: './attendance-chart.scss',
  templateUrl: './attendance-chart.html',
})
export class AttendanceChart {
  data = input.required<AttendancePoint[]>();

  chartData = computed(() => {
    return {
      labels: this.data().map((point) => point.date),
      datasets: [
        {
          label: 'Attendance',
          data: this.data().map((point) => point.count),
          fill: true,
          backgroundColor: 'rgba(129, 140, 248, 0.72)',
          hoverBackgroundColor: '#818cf8',
          borderRadius: 8,
          borderSkipped: false,
          barPercentage: 0.58,
          categoryPercentage: 0.72,
        },
      ],
    };
  });

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' as const },
    plugins: {
      legend: { display: false },
      tooltip: { displayColors: false, padding: 12, cornerRadius: 10 },
    },

    scales: {
      x: {
        grid: { display: false },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          autoSkip: true,
          color: '#94a3b8',
          font: { size: 11 },
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: { color: '#94a3b8', font: { size: 11 }, padding: 8, precision: 0 },
      },
    },
  };
}
