import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { Observable } from 'rxjs';
import {
  CreatePromoCodeRequest,
  PromoCodePreviewRequest,
  PromoCodeResponse,
} from '../models/promo-code.models';

@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/promo-codes`;

  getPromoCodes(isActive: boolean | null = null, search = ''): Observable<PromoCodeResponse[]> {
    const params: Record<string, string> = {};
    if (isActive !== null) params['isActive'] = String(isActive);
    if (search.trim()) params['search'] = search.trim();
    return this.http.get<PromoCodeResponse[]>(this.url, { params });
  }

  getPromoCode(id: number): Observable<PromoCodeResponse> {
    return this.http.get<PromoCodeResponse>(`${this.url}/${id}`);
  }

  createPromoCode(request: CreatePromoCodeRequest): Observable<void> {
    return this.http.post<void>(this.url, request);
  }

  activatePromoCode(id: number): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}/activate`, null);
  }

  deactivatePromoCode(id: number): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}/deactivate`, null);
  }

  previewPromoCode(request: PromoCodePreviewRequest): Observable<PromoCodeResponse> {
    return this.http.post<PromoCodeResponse>(`${this.url}/promo-preview`, request);
  }
}
