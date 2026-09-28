import {
  Component,
  computed,
  input,
  AfterViewInit,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { RevenuePoint } from '../../models/adminDashboardResponse';
import { ChartModule } from 'primeng/chart';

@Component({
  imports: [ChartModule],
  selector: 'app-revenue-chart',
  styleUrl: './revenue-chart.scss',
  templateUrl: './revenue-chart.html',
})
export class RevenueChart {
  data = input.required<RevenuePoint[]>();
  chartData = computed(() => {
    return {
      labels: this.data().map((point) => point.date),
      datasets: [
        {
          label: 'Revenue',
          data: this.data().map((point) => point.amount),
          fill: true,
          tension: 0.42,
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.14)',
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#34d399',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  });

  chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
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
        ticks: { color: '#94a3b8', font: { size: 11 }, padding: 8 },
      },
    },
  };
}
