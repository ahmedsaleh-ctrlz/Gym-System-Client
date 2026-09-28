import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { Observable } from 'rxjs';
import { AttendancePageResponse, AttendanceRecord } from '../models/attendance.models';

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/attendances`;

  getAttendances(
    pageNumber = 1,
    pageSize = 10,
    searchTerm = '',
    dateFrom = '',
    dateTo = '',
    sortBy = 'checkInAtUtc',
    sortDirection: 'asc' | 'desc' = 'desc',
  ): Observable<AttendancePageResponse> {
    let params = this.createParams(pageNumber, pageSize, sortDirection);
    params = this.withValue(params, 'searchTerm', searchTerm);
    params = this.withValue(params, 'dateFrom', dateFrom);
    params = this.withValue(params, 'dateTo', dateTo);
    params = this.withValue(params, 'sortBy', sortBy);
    return this.http.get<AttendancePageResponse>(this.url, { params });
  }

  getMemberHistory(
    memberId: number,
    pageNumber = 1,
    pageSize = 10,
    dateFrom = '',
    dateTo = '',
    sortDirection: 'asc' | 'desc' = 'desc',
  ): Observable<AttendancePageResponse> {
    let params = this.createParams(pageNumber, pageSize, sortDirection);
    params = this.withValue(params, 'dateFrom', dateFrom);
    params = this.withValue(params, 'dateTo', dateTo);
    return this.http.get<AttendancePageResponse>(`${this.url}/${memberId}/history`, { params });
  }

  checkIn(memberId: number): Observable<AttendanceRecord | null> {
    return this.http.post<AttendanceRecord | null>(`${this.url}/${memberId}/check-in`, {});
  }

  private createParams(
    pageNumber: number,
    pageSize: number,
    sortDirection: 'asc' | 'desc',
  ): HttpParams {
    return new HttpParams()
      .set('pageNumber', pageNumber)
      .set('pageSize', pageSize)
      .set('sortDirection', sortDirection);
  }

  private withValue(params: HttpParams, key: string, value: string): HttpParams {
    return value.trim() ? params.set(key, value.trim()) : params;
  }
}
