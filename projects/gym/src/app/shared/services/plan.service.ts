import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.models';
import { CreatePlanRequest, Plan, UpdatePlanRequest } from '../models/plan.models';

@Injectable({ providedIn: 'root' })
export class PlanService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/plans`;

  getPlans(
    pageNumber = 1,
    pageSize = 10,
    searchTerm = '',
    sortBy = 'title',
    sortDirection: 'asc' | 'desc' = 'asc',
  ): Observable<PageResponse<Plan>> {
    let params = new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);
    if (searchTerm.trim()) params = params.set('searchTerm', searchTerm.trim());
    return this.http.get<PageResponse<Plan>>(this.url, { params });
  }

  getPlanById(id: number): Observable<Plan> {
    return this.http.get<Plan>(`${this.url}/${id}`);
  }
  getMemberOptions(): Observable<{ items: Plan[] }> {
    const params = new HttpParams()
      .set('pageNumber', 1)
      .set('pageSize', 100)
      .set('sortBy', 'title')
      .set('sortDirection', 'asc');
    return this.http.get<{ items: Plan[] }>(this.url, { params });
  }
  createPlan(request: CreatePlanRequest): Observable<void> {
    return this.http.post<void>(this.url, request);
  }
  updatePlan(id: number, request: UpdatePlanRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}`, request);
  }
  deactivatePlan(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
