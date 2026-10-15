import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { Observable } from 'rxjs';
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

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/dashboard`;

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.url}/stats`);
  }

  getMembersSummary(): Observable<MembersSummary> {
    return this.http.get<MembersSummary>(`${this.url}/members-summary`);
  }

  getSubscriptionsSummary(): Observable<SubscriptionsSummary> {
    return this.http.get<SubscriptionsSummary>(`${this.url}/subscriptions-summary`);
  }

  getPaymentsSummary(): Observable<PaymentsSummary> {
    return this.http.get<PaymentsSummary>(`${this.url}/payments-summary`);
  }

  getRevenueSummary(query: PeriodQuery): Observable<RevenueSummary> {
    return this.http.get<RevenueSummary>(`${this.url}/revenue-summary`, {
      params: this.periodParams(query),
    });
  }

  getAttendanceSummary(query: PeriodQuery): Observable<AttendanceSummary> {
    return this.http.get<AttendanceSummary>(`${this.url}/attendance-summary`, {
      params: this.periodParams(query),
    });
  }

  getPlansSummary(): Observable<PlansSummary> {
    return this.http.get<PlansSummary>(`${this.url}/plans-summary`);
  }

  getRecentCheckIns(): Observable<RecentCheckInsResponse> {
    return this.http.get<RecentCheckInsResponse>(`${this.url}/recent-check-ins`);
  }

  getAiInsights(): Observable<AdminAiInsightsResponse> {
    return this.http.get<AdminAiInsightsResponse>(`${this.url}/ai-insights`);
  }

  private periodParams(query: PeriodQuery): HttpParams {
    let params = new HttpParams().set('period', query.period).set('year', query.year);
    if (query.period === 'Month' && query.month !== undefined) {
      params = params.set('month', query.month);
    }
    return params;
  }
}
