import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { catchError, forkJoin, map, Observable, of } from 'rxjs';
import { PageResponse } from '../models/page.models';
import {
  CreateSubscriptionRequest,
  FreezeSubscriptionRequest,
  RenewSubscriptionRequest,
  Subscription,
  SubscriptionFilters,
} from '../models/subscription.models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/subscriptions`;

  getSubscriptions(filters: SubscriptionFilters): Observable<PageResponse<Subscription>> {
    const terms = filters.searchTerm.trim().split(/\s+/).filter(Boolean);

    if (terms.length > 1) {
      const broadFilters = { ...filters, pageNumber: 1, pageSize: Math.max(filters.pageSize, 100) };
      return forkJoin(terms.map((term) => this.getSubscriptionsPage(broadFilters, term))).pipe(
        map((responses) => {
          const uniqueSubscriptions = new Map<number, Subscription>();
          responses
            .flatMap((response) => response.items ?? [])
            .forEach((subscription) =>
              uniqueSubscriptions.set(subscription.subscriptionId, subscription),
            );
          const matchingSubscriptions = [...uniqueSubscriptions.values()].filter((subscription) => {
            const memberName = subscription.memberName.toLocaleLowerCase();
            return terms.every((term) => memberName.includes(term.toLocaleLowerCase()));
          });
          const start = (filters.pageNumber - 1) * filters.pageSize;
          return {
            pageNumber: filters.pageNumber,
            pageSize: filters.pageSize,
            totalCount: matchingSubscriptions.length,
            items: matchingSubscriptions.slice(start, start + filters.pageSize),
          };
        }),
      );
    }

    return this.getSubscriptionsPage(filters, terms[0] ?? '');
  }

  private getSubscriptionsPage(
    filters: SubscriptionFilters,
    searchTerm: string,
  ): Observable<PageResponse<Subscription>> {
    let params = new HttpParams()
      .set('pageNumber', filters.pageNumber)
      .set('pageSize', filters.pageSize)
      .set('sortDirection', filters.sortDirection);
    const values: Record<string, string | number> = {
      searchTerm,
      status: filters.status,
      planName: filters.planName,
      startDateFrom: filters.startDateFrom,
      startDateTo: filters.startDateTo,
      endDateFrom: filters.endDateFrom,
      endDateTo: filters.endDateTo,
      sortBy: filters.sortBy,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value !== '' && value !== null) params = params.set(key, value);
    });
    return this.http.get<PageResponse<Subscription>>(this.url, { params });
  }

  getMemberSubscription(memberId: number): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.url}/member/${memberId}`);
  }
  getCurrent(memberId: number): Observable<Subscription> {
    return this.getMemberSubscription(memberId);
  }
  getMemberHistory(memberId: number): Observable<Subscription[]> {
    return this.http.get<Subscription[]>(`${this.url}/member/${memberId}/history`);
  }

  getHistory(memberId: number): Observable<Subscription[]> {
    return this.getMemberHistory(memberId);
  }
  getActive(memberId: number): Observable<Subscription | null> {
    return this.resolveEligible(memberId, ['active']);
  }
  getRenewable(memberId: number): Observable<Subscription | null> {
    return this.resolveEligible(memberId, ['active', 'scheduled', 'frozen']);
  }
  create(request: CreateSubscriptionRequest): Observable<void> {
    return this.http.post<void>(this.url, request);
  }
  renew(request: RenewSubscriptionRequest): Observable<void> {
    return this.http.post<void>(`${this.url}/renew`, request);
  }
  activate(id: number): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/activate`, null);
  }
  schedule(id: number): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/schedule`, null);
  }
  cancel(id: number): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/cancel`, null);
  }
  freeze(id: number, request: FreezeSubscriptionRequest): Observable<void> {
    return this.http.put<void>(`${this.url}/${id}/freeze`, request);
  }

  private resolveEligible(
    memberId: number,
    statuses: readonly string[],
  ): Observable<Subscription | null> {
    return forkJoin({
      current: this.getCurrent(memberId).pipe(catchError(() => of(null))),
      history: this.getHistory(memberId).pipe(catchError(() => of([] as Subscription[]))),
    }).pipe(
      map(({ current, history }) => {
        const candidates = current ? [current, ...history] : history;
        for (const status of statuses) {
          const match = candidates.find(
            (subscription) => String(subscription.status ?? '').trim().toLowerCase() === status,
          );
          if (match) return match;
        }
        return null;
      }),
    );
  }
}
