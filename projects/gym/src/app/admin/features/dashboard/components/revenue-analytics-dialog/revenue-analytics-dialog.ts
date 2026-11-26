import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import {
  DashboardPeriod,
  PeriodQuery,
  RevenuePoint,
  RevenueSummary,
} from '../../models/adminDashboardResponse';
import { DashboardService } from '../../services/dashboard-service';

@Component({
  selector: 'app-revenue-analytics-dialog',
  imports: [ChartModule, DialogModule, CurrencyPipe, DecimalPipe],
  templateUrl: './revenue-analytics-dialog.html',
  styleUrl: './revenue-analytics-dialog.scss',
})
export class RevenueAnalyticsDialog {
  private readonly service = inject(DashboardService);
  readonly visible = input(false);
  readonly initialYear = input.required<number>();
  readonly initialMonth = input.required<number>();
  readonly closed = output<void>();

  readonly period = signal<DashboardPeriod>('Month');
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly summary = signal<RevenueSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  private readonly cache = new Map<string, RevenueSummary>();
  private requestKey = '';

  readonly chartData = computed(() => {
    const summary = this.summary();
    const current = this.pointsForChart(summary?.data ?? []);
    const previous = this.pointsForChart(summary?.previousPeriodData ?? []);
    const labels = this.period() === 'Year'
      ? Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2020, index, 1)))
      : this.labels(current, previous);
    return {
      labels,
      datasets: [
        { label: 'Current period', data: this.values(current, labels), borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.12)', fill: true, tension: .35, pointRadius: this.period() === 'Year' ? 3 : 1.5 },
        { label: 'Previous period', data: this.values(previous, labels), borderColor: '#94a3b8', backgroundColor: 'transparent', borderDash: [6, 5], fill: false, tension: .35, pointRadius: 2 },
      ],
    };
  });

  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { displayColors: false } },
    scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.14)' }, ticks: { callback: (value: string | number) => `${Number(value) / 1000}k` } } },
  };

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.year.set(this.initialYear());
        this.month.set(this.initialMonth());
        this.load();
      }
    });
  }

  selectPeriod(period: DashboardPeriod): void {
    if (this.period() !== period) {
      this.period.set(period);
      this.load();
    }
  }

  selectYear(year: number): void {
    this.year.set(year);
    this.load();
  }

  selectMonth(month: number): void {
    this.month.set(month);
    this.load();
  }

  retry(): void {
    this.cache.delete(this.key());
    this.load();
  }

  close(): void {
    this.closed.emit();
  }

  private load(): void {
    const key = this.key();
    const cached = this.cache.get(key);
    if (cached) {
      this.summary.set(cached);
      this.error.set(false);
      return;
    }
    if (this.loading() && this.requestKey === key) return;
    this.requestKey = key;
    this.loading.set(true);
    this.error.set(false);
    this.service.getRevenueSummary(this.query()).subscribe({
      next: (summary) => { this.cache.set(key, summary); this.summary.set(summary); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); },
    });
  }

  private query(): PeriodQuery {
    return { period: this.period(), year: this.year(), ...(this.period() === 'Month' ? { month: this.month() } : {}) };
  }

  private key(): string {
    return `${this.period()}-${this.year()}-${this.period() === 'Month' ? this.month() : ''}`;
  }

  private pointsForChart(points: RevenuePoint[]): RevenuePoint[] {
    return [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private labels(current: RevenuePoint[], previous: RevenuePoint[]): string[] {
    return [...new Set([...current, ...previous].map((point) => point.date))].sort();
  }

  private values(points: RevenuePoint[], labels: string[]): (number | null)[] {
    const byDate = new Map(points.map((point) => [this.period() === 'Year' ? this.monthLabel(point.date) : point.date, point.amount]));
    return labels.map((label) => byDate.get(label) ?? null);
  }

  private monthLabel(value: string): string {
    const date = new Date(value.length === 7 ? `${value}-01T00:00:00` : value);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
  }

  formatLabel(value: string): string {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(date);
  }

  readonly years = computed(() => Array.from({ length: 5 }, (_, index) => this.initialYear() - index));
  readonly months = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2020, index, 1)) }));
}
