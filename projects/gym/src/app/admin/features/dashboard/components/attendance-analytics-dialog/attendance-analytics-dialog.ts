import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { AttendancePoint, AttendanceSummary, DashboardPeriod, PeriodQuery } from '../../models/adminDashboardResponse';
import { DashboardService } from '../../services/dashboard-service';

@Component({
  selector: 'app-attendance-analytics-dialog',
  imports: [ChartModule, DialogModule, DecimalPipe],
  templateUrl: './attendance-analytics-dialog.html',
  styleUrl: './attendance-analytics-dialog.scss',
})
export class AttendanceAnalyticsDialog {
  private readonly service = inject(DashboardService);
  readonly visible = input(false);
  readonly initialYear = input.required<number>();
  readonly initialMonth = input.required<number>();
  readonly closed = output<void>();
  readonly period = signal<DashboardPeriod>('Month');
  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth() + 1);
  readonly summary = signal<AttendanceSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  private readonly cache = new Map<string, AttendanceSummary>();
  private requestKey = '';

  readonly chartData = computed(() => {
    const summary = this.summary();
    const current = this.sorted(summary?.data ?? []);
    const previous = this.sorted(summary?.previousPeriodData ?? []);
    const labels = this.period() === 'Year'
      ? Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2020, index, 1)))
      : this.labels(current, previous);
    return {
      labels,
      datasets: [
        { label: 'Current period', data: this.values(current, labels), backgroundColor: 'rgba(14,165,233,.72)', borderRadius: 6, borderSkipped: false },
        { label: 'Previous period', data: this.values(previous, labels), backgroundColor: 'rgba(148,163,184,.42)', borderRadius: 6, borderSkipped: false },
      ],
    };
  });
  readonly chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { displayColors: false } },
    scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }, y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,.14)' }, ticks: { precision: 0 } } },
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
  selectPeriod(period: DashboardPeriod): void { if (this.period() !== period) { this.period.set(period); this.load(); } }
  selectYear(year: number): void { this.year.set(year); this.load(); }
  selectMonth(month: number): void { this.month.set(month); this.load(); }
  retry(): void { this.cache.delete(this.key()); this.load(); }
  close(): void { this.closed.emit(); }

  private load(): void {
    const key = this.key();
    const cached = this.cache.get(key);
    if (cached) { this.summary.set(cached); this.error.set(false); return; }
    if (this.loading() && this.requestKey === key) return;
    this.requestKey = key; this.loading.set(true); this.error.set(false);
    this.service.getAttendanceSummary(this.query()).subscribe({
      next: (summary) => { this.cache.set(key, summary); this.summary.set(summary); this.loading.set(false); },
      error: () => { this.loading.set(false); this.error.set(true); },
    });
  }
  private query(): PeriodQuery { return { period: this.period(), year: this.year(), ...(this.period() === 'Month' ? { month: this.month() } : {}) }; }
  private key(): string { return `${this.period()}-${this.year()}-${this.period() === 'Month' ? this.month() : ''}`; }
  private sorted(points: AttendancePoint[]): AttendancePoint[] { return [...points].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); }
  private labels(current: AttendancePoint[], previous: AttendancePoint[]): string[] { return [...new Set([...current, ...previous].map((point) => point.date))].sort(); }
  private values(points: AttendancePoint[], labels: string[]): (number | null)[] { const byDate = new Map(points.map((point) => [this.period() === 'Year' ? this.monthLabel(point.date) : point.date, point.count])); return labels.map((label) => byDate.get(label) ?? null); }
  private monthLabel(value: string): string { const date = new Date(value.length === 7 ? `${value}-01T00:00:00` : value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en', { month: 'short' }).format(date); }
  readonly years = computed(() => Array.from({ length: 5 }, (_, index) => this.initialYear() - index));
  readonly months = Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2020, index, 1)) }));
}
