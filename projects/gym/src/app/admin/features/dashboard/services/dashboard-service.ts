
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from 'config';
import { AuthService } from 'auth';
import { map, Observable, of, switchMap, throwError } from 'rxjs';

import {
  AttendanceSummary,
  AdminAiInsightsResponse,
  DashboardStats,
  MembersSummary,
  PaymentsSummary,
  PeriodQuery,
  PlansSummary,
  RecentCheckInsResponse,
  RevenueSummary,
  SubscriptionsSummary,
} from '../models/adminDashboardResponse';

interface GraphQlError { message: string; extensions?: { code?: string }; }
interface GraphQlResponse<T> { data?: T; errors?: GraphQlError[]; }
interface GraphQlPeriodPoint { date: string; amount?: number | string; count?: number; }
interface GraphQlRevenueSummary extends Omit<RevenueSummary, 'currentPeriodRevenue' | 'previousPeriodRevenue' | 'growthPercentage' | 'data' | 'previousPeriodData'> {
  currentPeriodRevenue: number | string;
  previousPeriodRevenue: number | string;
  growthPercentage: number | string;
  data: GraphQlPeriodPoint[];
  previousPeriodData: GraphQlPeriodPoint[];
}
interface GraphQlAttendanceSummary extends Omit<AttendanceSummary, 'growthPercentage' | 'averageDailyAttendance' | 'data' | 'previousPeriodData'> {
  growthPercentage: number | string;
  averageDailyAttendance: number | string;
  data: GraphQlPeriodPoint[];
  previousPeriodData: GraphQlPeriodPoint[];
}
interface GraphQlPaymentsSummary extends Omit<PaymentsSummary, 'pendingPaymentsAmount' | 'underReviewPaymentsAmount'> {
  pendingPaymentsAmount: number | string;
  underReviewPaymentsAmount: number | string;
}
interface GraphQlPlanPerformance {
  planId: number;
  planName: string;
  subscriptionsCount: number;
  revenue: number | string;
}
interface GraphQlPlansSummary extends Omit<PlansSummary, 'highestPlanRevenue' | 'plans'> {
  highestPlanRevenue: number | string;
  plans: GraphQlPlanPerformance[];
}

@Injectable({ providedIn: 'root' })
export class DashboardService {

private readonly http = inject(HttpClient);
private readonly config = inject(APP_CONFIG);
private readonly authService = inject(AuthService);

private readonly graphqlUrl = this.config.graphqlUrl;
private readonly legacyDashboardUrl = `${this.config.apiUrl}/dashboard`;


  getStats(): Observable<DashboardStats> {
    return this.query<{ adminDashboardStats: DashboardStats }>(`query AdminDashboardStats {
      adminDashboardStats { totalMembers activeSubscriptions expiringSubscriptionsNext7Days thisMonthRevenue previousMonthRevenue revenueGrowthPercentage todayAttendanceCount pendingPaymentsCount underReviewPaymentsCount mostPopularPlan mostPopularPlanSubscriptionsCount }
    }`).pipe(map(({ adminDashboardStats }) => ({
      ...adminDashboardStats,
      thisMonthRevenue: this.toNumber(adminDashboardStats.thisMonthRevenue),
      previousMonthRevenue: this.toNumber(adminDashboardStats.previousMonthRevenue),
      revenueGrowthPercentage: this.toNumber(adminDashboardStats.revenueGrowthPercentage),
    })));
  }

  getMembersSummary(): Observable<MembersSummary> {
    return this.query<{ adminMembersSummary: MembersSummary }>(`query AdminMembersSummary {
      adminMembersSummary { totalMembers newMembersThisMonth newMembersPreviousMonth }
    }`).pipe(map(({ adminMembersSummary }) => adminMembersSummary));
  }

  getSubscriptionsSummary(): Observable<SubscriptionsSummary> {
    return this.query<{ adminSubscriptionsSummary: SubscriptionsSummary }>(`query AdminSubscriptionsSummary {
      adminSubscriptionsSummary { activeSubscriptions frozenSubscriptions scheduledSubscriptions expiredSubscriptions newSubscriptionsThisMonth newSubscriptionsPreviousMonth expiringSubscriptionsNext7Days expiringSubscriptionsNext30Days expiredSubscriptionsThisMonth }
    }`).pipe(map(({ adminSubscriptionsSummary }) => adminSubscriptionsSummary));
  }

  getPaymentsSummary(): Observable<PaymentsSummary> {
    return this.query<{ adminPaymentsSummary: GraphQlPaymentsSummary }>(`query AdminPaymentsSummary {
      adminPaymentsSummary { pendingPaymentsCount underReviewPaymentsCount paidPaymentsCount failedPaymentsCount refundedPaymentsCount cancelledPaymentsCount rejectedPaymentsCount pendingPaymentsAmount underReviewPaymentsAmount }
    }`).pipe(map(({ adminPaymentsSummary }) => ({
      ...adminPaymentsSummary,
      pendingPaymentsAmount: this.toNumber(adminPaymentsSummary.pendingPaymentsAmount),
      underReviewPaymentsAmount: this.toNumber(adminPaymentsSummary.underReviewPaymentsAmount),
    })));
  }

  getRevenueSummary(query: PeriodQuery): Observable<RevenueSummary> {
    return this.query<{ adminRevenueSummary: GraphQlRevenueSummary }>(`query AdminRevenueSummary($period: RevenuePeriod!, $year: Int, $month: Int) {
      adminRevenueSummary(period: $period, year: $year, month: $month) {
        currentPeriodRevenue previousPeriodRevenue growthPercentage
        data { date amount }
        previousPeriodData { date amount }
      }
    }`, this.periodVariables(query)).pipe(map(({ adminRevenueSummary }) => ({
      ...adminRevenueSummary,
      currentPeriodRevenue: this.toNumber(adminRevenueSummary.currentPeriodRevenue),
      previousPeriodRevenue: this.toNumber(adminRevenueSummary.previousPeriodRevenue),
      growthPercentage: this.toNumber(adminRevenueSummary.growthPercentage),
      data: adminRevenueSummary.data.map((point) => ({ date: point.date, amount: this.toNumber(point.amount ?? 0) })),
      previousPeriodData: adminRevenueSummary.previousPeriodData.map((point) => ({ date: point.date, amount: this.toNumber(point.amount ?? 0) })),
    })));
  }

  getAttendanceSummary(query: PeriodQuery): Observable<AttendanceSummary> {
    return this.query<{ adminAttendanceSummary: GraphQlAttendanceSummary }>(`query AdminAttendanceSummary($period: AttendancePeriod!, $year: Int, $month: Int) {
      adminAttendanceSummary(period: $period, year: $year, month: $month) {
        currentPeriodAttendance previousPeriodAttendance growthPercentage averageDailyAttendance peakHour peakHourAttendanceCount
        data { date count }
        previousPeriodData { date count }
      }
    }`, this.periodVariables(query)).pipe(map(({ adminAttendanceSummary }) => ({
      ...adminAttendanceSummary,
      growthPercentage: this.toNumber(adminAttendanceSummary.growthPercentage),
      averageDailyAttendance: this.toNumber(adminAttendanceSummary.averageDailyAttendance),
      data: adminAttendanceSummary.data.map((point) => ({ date: point.date, count: point.count ?? 0 })),
      previousPeriodData: adminAttendanceSummary.previousPeriodData.map((point) => ({ date: point.date, count: point.count ?? 0 })),
    })));
  }

  getPlansSummary(): Observable<PlansSummary> {
    return this.query<{ adminPlansSummary: GraphQlPlansSummary }>(`query AdminPlansSummary {
      adminPlansSummary { mostPopularPlan mostPopularPlanSubscriptionsCount highestRevenuePlan highestPlanRevenue plans { planId planName subscriptionsCount revenue } }
    }`).pipe(map(({ adminPlansSummary }) => ({
      ...adminPlansSummary,
      highestPlanRevenue: this.toNumber(adminPlansSummary.highestPlanRevenue),
      plans: adminPlansSummary.plans.map((plan) => ({ ...plan, revenue: this.toNumber(plan.revenue) })),
    })));
  }

  getRecentCheckIns(): Observable<RecentCheckInsResponse> {
    return this.query<{ adminRecentCheckIns: RecentCheckInsResponse }>(`query AdminRecentCheckIns {
      adminRecentCheckIns { checkIns { memberId memberName imageUrl checkInAtUtc } }
    }`).pipe(map(({ adminRecentCheckIns }) => adminRecentCheckIns));
  }

  /** AI insights are not part of the supplied GraphQL schema, so this existing endpoint remains intact. */
  getAiInsights(): Observable<AdminAiInsightsResponse> {
    return this.http.get<AdminAiInsightsResponse>(`${this.legacyDashboardUrl}/ai-insights`);
  }

  private periodVariables(query: PeriodQuery): { period: 'MONTH' | 'YEAR'; year: number; month?: number } {
    return {
      period: query.period.toUpperCase() as 'MONTH' | 'YEAR',
      year: query.year,
      ...(query.period === 'Month' ? { month: query.month } : {}),
    };
  }

  private query<T>(query: string, variables?: Record<string, unknown>, canRefresh = true): Observable<T> {
    return this.http.post<GraphQlResponse<T>>(this.graphqlUrl, { query, variables }).pipe(
      switchMap((response) => {
        const errors = response.errors ?? [];
        const authenticationFailure = errors.some((error) =>
          error.extensions?.code === 'AUTH_NOT_AUTHENTICATED' || /not authorized|unauthenticated/i.test(error.message),
        );
        if (authenticationFailure && canRefresh) {
          return this.authService.refreshToken().pipe(
            switchMap(() => this.query<T>(query, variables, false)),
          );
        }
        const data = response.data;
        // GraphQL may return usable partial data together with field-level errors.
        // Keep rendering the resolved dashboard values when that happens.
        if (!data) {
          const message = errors.length
            ? errors.map((error) => error.message).join('; ')
            : 'GraphQL response did not contain data.';
          return throwError(() => new Error(message));
        }
        return of(data);
      }),
    );
  }

  private toNumber(value: number | string): number {
    return typeof value === 'number' ? value : Number(value);
  }
}
