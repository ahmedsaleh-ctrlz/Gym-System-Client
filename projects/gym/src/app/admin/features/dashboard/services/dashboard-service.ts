import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AdminDashboardResponse } from '../models/adminDashboardResponse';
import { appConfig } from 'config';
import { Observable } from 'rxjs';

@Service()
export class DashboardService {
  http = inject(HttpClient);

  getDashboardData(): Observable<AdminDashboardResponse> {
    return this.http.get<AdminDashboardResponse>(`${appConfig.apiUrl}/dashboard/stats`);
  }
}
