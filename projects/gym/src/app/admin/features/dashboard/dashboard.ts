import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import {
  AttendanceSummary,
  DashboardPeriod,
  DashboardStats,
  MembersSummary,
  PaymentsSummary,
  PlansSummary,
  RecentCheckIn,
  RevenueSummary,
  SubscriptionsSummary,
} from './models/adminDashboardResponse';
import { DashboardService } from './services/dashboard-service';
import { RecentCheckIns } from './components/recent-check-in/recent-check-in';
import { RevenueAnalyticsDialog } from './components/revenue-analytics-dialog/revenue-analytics-dialog';
import { AttendanceAnalyticsDialog } from './components/attendance-analytics-dialog/attendance-analytics-dialog';
import { AiInsightsDialog } from './components/ai-insights-dialog/ai-insights-dialog';

@Component({
  imports: [CurrencyPipe, DatePipe, DecimalPipe, ChartModule, RecentCheckIns, RevenueAnalyticsDialog, AttendanceAnalyticsDialog, AiInsightsDialog],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);
  readonly now = new Date();
  readonly monthNames = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(2026, month, 1)),
  );
  readonly selectedYear = signal(this.now.getFullYear());
  readonly selectedMonth = signal(this.now.getMonth() + 1);
  readonly revenuePeriod = signal<DashboardPeriod>('Month');
  readonly attendancePeriod = signal<DashboardPeriod>('Month');
  readonly revenueAnalyticsVisible = signal(false);
  readonly attendanceAnalyticsVisible = signal(false);
  readonly aiInsightsVisible = signal(false);

  readonly stats = signal<DashboardStats | null>(null);
  readonly statsLoading = signal(true);
  readonly statsError = signal(false);
  readonly members = signal<MembersSummary | null>(null);
  readonly membersLoading = signal(true);
  readonly membersError = signal(false);
  readonly subscriptions = signal<SubscriptionsSummary | null>(null);
  readonly subscriptionsLoading = signal(true);
  readonly subscriptionsError = signal(false);
  readonly payments = signal<PaymentsSummary | null>(null);
  readonly paymentsLoading = signal(true);
  readonly paymentsError = signal(false);
  readonly revenue = signal<RevenueSummary | null>(null);
  readonly revenueLoading = signal(true);
  readonly revenueError = signal(false);
  readonly attendance = signal<AttendanceSummary | null>(null);
  readonly attendanceLoading = signal(true);
  readonly attendanceError = signal(false);
  readonly plans = signal<PlansSummary | null>(null);
  readonly plansLoading = signal(true);
  readonly plansError = signal(false);
  readonly checkIns = signal<RecentCheckIn[]>([]);
  readonly checkInsLoading = signal(true);
  readonly checkInsError = signal(false);

  readonly previewRevenue = computed(() => this.latestElapsed(this.revenue()?.data ?? []));
  readonly previewAttendance = computed(() => this.latestElapsed(this.attendance()?.data ?? []));

  readonly subscriptionChartData = computed(() => {
    const summary = this.subscriptions();
    return {
      labels: ['Active', 'Frozen', 'Scheduled', 'Expired'],
      datasets: [
        {
          data: summary
            ? [
                summary.activeSubscriptions,
                summary.frozenSubscriptions,
                summary.scheduledSubscriptions,
                summary.expiredSubscriptions,
              ]
            : [],
          backgroundColor: ['#22c55e', '#f59e0b', '#3b82f6', '#cbd5e1'],
          borderWidth: 0,
          hoverOffset: 5,
        },
      ],
    };
  });
  readonly subscriptionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: { legend: { display: false }, tooltip: { displayColors: false } },
  };

  readonly planChartData = computed(() => {
    const plans = this.plans()?.plans ?? [];
    return {
      labels: plans.map((plan) => plan.planName),
      datasets: [
        {
          label: 'Subscriptions',
          data: plans.map((plan) => plan.subscriptionsCount),
          backgroundColor: '#4f46e5',
          borderRadius: 7,
          barThickness: 16,
          xAxisID: 'x',
        },
        {
          label: 'Revenue (EGP)',
          data: plans.map((plan) => plan.revenue),
          backgroundColor: '#22c55e',
          borderRadius: 7,
          barThickness: 16,
          xAxisID: 'xRevenue',
        },
      ],
    };
  });
  readonly planChartOptions = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        callbacks: {
          label: (context: { datasetIndex: number; parsed: { x: number | null } }) =>
            context.datasetIndex === 1
              ? ` Revenue: ${new Intl.NumberFormat('en', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(context.parsed.x ?? 0)}`
              : ` Subscriptions: ${(context.parsed.x ?? 0).toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        position: 'bottom' as const,
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: { precision: 0 },
      },
      xRevenue: {
        beginAtZero: true,
        position: 'top' as const,
        grid: { drawOnChartArea: false },
        ticks: { callback: (value: string | number) => `${Number(value) / 1000}k` },
      },
      y: { grid: { display: false } },
    },
  };

  readonly revenueChartData = computed(() => {
    return {
      labels: this.previewRevenue().map((point) =>
        this.formatPeriodLabel(point.date, this.revenuePeriod()),
      ),
      datasets: [
        {
          label: 'Revenue',
          data: this.previewRevenue().map((point) => point.amount),
          fill: true,
          tension: 0.35,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79, 70, 229, 0.12)',
          borderWidth: 2.5,
          pointRadius: this.revenuePeriod() === 'Month' ? 0 : 3,
          pointHoverRadius: 5,
        },
      ],
    };
  });
  readonly revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' as const },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        callbacks: {
          label: (context: { parsed: { y: number | null } }) =>
            new Intl.NumberFormat('en', {
              style: 'currency',
              currency: 'EGP',
              maximumFractionDigits: 0,
            }).format(context.parsed.y ?? 0),
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: { callback: (value: string | number) => `${Number(value) / 1000}k` },
      },
    },
  };

  readonly attendanceChartData = computed(() => ({
    labels: this.previewAttendance().map((point) =>
      this.formatPeriodLabel(point.date, this.attendancePeriod()),
    ),
    datasets: [
      {
        label: 'Check-ins',
        data: this.previewAttendance().map((point) => point.count),
        backgroundColor: 'rgba(14, 165, 233, 0.78)',
        hoverBackgroundColor: '#0284c7',
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.62,
        categoryPercentage: 0.72,
      },
    ],
  }));
  readonly attendanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { displayColors: false } },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.12)' },
        ticks: { precision: 0 },
      },
    },
  };

  constructor() {
    this.loadOverview();
    this.loadMembers();
    this.loadSubscriptions();
    this.loadPayments();
    this.loadRevenue();
    this.loadAttendance();
    this.loadPlans();
    this.loadCheckIns();
  }

  loadOverview(): void {
    this.load(this.dashboardService.getStats(), this.stats, this.statsLoading, this.statsError);
  }
  loadMembers(): void {
    this.load(
      this.dashboardService.getMembersSummary(),
      this.members,
      this.membersLoading,
      this.membersError,
    );
  }
  loadSubscriptions(): void {
    this.load(
      this.dashboardService.getSubscriptionsSummary(),
      this.subscriptions,
      this.subscriptionsLoading,
      this.subscriptionsError,
    );
  }
  loadPayments(): void {
    this.load(
      this.dashboardService.getPaymentsSummary(),
      this.payments,
      this.paymentsLoading,
      this.paymentsError,
    );
  }
  loadPlans(): void {
    this.load(
      this.dashboardService.getPlansSummary(),
      this.plans,
      this.plansLoading,
      this.plansError,
    );
  }
  loadCheckIns(): void {
    this.checkInsLoading.set(true);
    this.checkInsError.set(false);
    this.dashboardService.getRecentCheckIns().subscribe({
      next: (response) => {
        this.checkIns.set(response.checkIns ?? []);
        this.checkInsLoading.set(false);
      },
      error: () => {
        this.checkInsError.set(true);
        this.checkInsLoading.set(false);
      },
    });
  }

  setRevenuePeriod(period: DashboardPeriod): void {
    if (this.revenuePeriod() === period) return;
    this.revenuePeriod.set(period);
    this.loadRevenue();
  }
  setAttendancePeriod(period: DashboardPeriod): void {
    if (this.attendancePeriod() === period) return;
    this.attendancePeriod.set(period);
    this.loadAttendance();
  }

  openRevenueAnalytics(): void { this.revenueAnalyticsVisible.set(true); }
  closeRevenueAnalytics(): void { this.revenueAnalyticsVisible.set(false); }
  openAttendanceAnalytics(): void { this.attendanceAnalyticsVisible.set(true); }
  closeAttendanceAnalytics(): void { this.attendanceAnalyticsVisible.set(false); }
  openAiInsights(): void { this.aiInsightsVisible.set(true); }
  closeAiInsights(): void { this.aiInsightsVisible.set(false); }
  loadRevenue(): void {
    this.load(
      this.dashboardService.getRevenueSummary(this.periodQuery(this.revenuePeriod())),
      this.revenue,
      this.revenueLoading,
      this.revenueError,
    );
  }
  loadAttendance(): void {
    this.load(
      this.dashboardService.getAttendanceSummary(this.periodQuery(this.attendancePeriod())),
      this.attendance,
      this.attendanceLoading,
      this.attendanceError,
    );
  }

  growthClass(growth: number): string {
    return growth > 0 ? 'positive' : growth < 0 ? 'negative' : 'neutral';
  }
  growthIcon(growth: number): string {
    return growth > 0
      ? 'pi pi-arrow-up-right'
      : growth < 0
        ? 'pi pi-arrow-down-right'
        : 'pi pi-minus';
  }
  periodLabel(period: DashboardPeriod): string {
    return period === 'Month' ? 'vs previous month' : 'vs previous year';
  }
  paymentTotal(): number {
    const p = this.payments();
    return p
      ? p.pendingPaymentsCount +
          p.underReviewPaymentsCount +
          p.paidPaymentsCount +
          p.failedPaymentsCount +
          p.refundedPaymentsCount +
          p.cancelledPaymentsCount +
          p.rejectedPaymentsCount
      : 0;
  }
  paymentPercent(count: number): number {
    const total = this.paymentTotal();
    return total ? (count / total) * 100 : 0;
  }
  memberGrowthWidth(): number {
    const current = this.members()?.newMembersThisMonth ?? 0;
    const previous = this.members()?.newMembersPreviousMonth ?? 0;
    return Math.max(current, previous) ? (current / Math.max(current, previous)) * 100 : 0;
  }
  formatPeriodLabel(value: string, period: DashboardPeriod): string {
    const date = new Date(`${value}${value.length === 10 ? 'T00:00:00' : ''}`);
    if (Number.isNaN(date.getTime())) return value;
    return period === 'Year'
      ? new Intl.DateTimeFormat('en', { month: 'short' }).format(date)
      : new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' }).format(date);
  }

  private latestElapsed<T extends { date: string }>(points: T[]): T[] {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return [...points]
      .filter((point) => {
        const date = new Date(`${point.date}${point.date.length === 10 ? 'T00:00:00' : ''}`);
        return !Number.isNaN(date.getTime()) && date.getTime() <= today.getTime();
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }
  private periodQuery(period: DashboardPeriod) {
    return {
      period,
      year: this.selectedYear(),
      ...(period === 'Month' ? { month: this.selectedMonth() } : {}),
    };
  }
  private load<T>(
    request: import('rxjs').Observable<T>,
    value: WritableSignal<T | null>,
    loading: WritableSignal<boolean>,
    error: WritableSignal<boolean>,
  ): void {
    loading.set(true);
    error.set(false);
    request.subscribe({
      next: (data) => {
        value.set(data);
        loading.set(false);
      },
      error: () => {
        error.set(true);
        loading.set(false);
      },
    });
  }
}
