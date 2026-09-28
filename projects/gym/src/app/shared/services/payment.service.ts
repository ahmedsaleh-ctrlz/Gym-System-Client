import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { Observable } from 'rxjs';
import { PageResponse } from '../models/page.models';
import {
  Payment,
  PaymentFilters,
  PayPaymentRequest,
  RefundPaymentRequest,
  StripePaymentIntentResult,
} from '../models/payment.models';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/payments`;

  getPayments(filters: PaymentFilters): Observable<PageResponse<Payment>> {
    let params = new HttpParams()
      .set('pageNumber', filters.pageNumber)
      .set('pageSize', filters.pageSize)
      .set('sortDirection', filters.sortDirection);
    const values: Record<string, string | number | null> = {
      searchTerm: filters.searchTerm,
      status: filters.status,
      paymentMethod: filters.paymentMethod,
      sortBy: filters.sortBy,
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value !== '' && value !== null) params = params.set(key, value);
    });
    return this.http.get<PageResponse<Payment>>(this.url, { params });
  }

  getPayment(id: number): Observable<Payment> {
    return this.http.get<Payment>(`${this.url}/${id}`);
  }
  getMemberHistory(memberId: number): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.url}/member/${memberId}`);
  }
  getHistory(memberId: number): Observable<Payment[]> {
    return this.getMemberHistory(memberId);
  }
  createStripeIntent(
    paymentId: number,
    promoCodeId: number | null = null,
  ): Observable<StripePaymentIntentResult> {
    return this.http.post<StripePaymentIntentResult>(`${this.url}/${paymentId}/stripe-intent`, {
      paymentId,
      promoCodeId: promoCodeId ?? null,
    });
  }
  pay(request: PayPaymentRequest): Observable<void> {
    return this.http.post<void>(`${this.url}/Pay`, request);
  }
  refund(request: RefundPaymentRequest): Observable<void> {
    return this.http.post<void>(`${this.url}/refund`, request);
  }
  cancel(paymentId: number): Observable<void> {
    return this.http.put<void>(`${this.url}/Cancel`, { paymentId });
  }
}
