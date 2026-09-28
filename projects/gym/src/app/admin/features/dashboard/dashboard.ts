import { Component, inject, signal, ViewEncapsulation } from '@angular/core';
import { StatCard } from '../../../shared/components/stat-card/stat-card';
import { DashboardService } from './services/dashboard-service';
import { AdminDashboardResponse } from './models/adminDashboardResponse';
import { ChartModule } from 'primeng/chart';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { CurrencyPipe } from '@angular/common';
import { RevenueChart } from './components/revenue-chart/revenue-chart';
import { AttendanceChart } from './components/attendance-chart/attendance-chart';
import { RecentCheckIns } from './components/recent-check-in/recent-check-in';

@Component({
  imports: [
    StatCard,
    ChartModule,
    AvatarModule,
    TagModule,
    CurrencyPipe,
    RevenueChart,
    AttendanceChart,
    RecentCheckIns,
  ],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  dashboardState = signal<AdminDashboardResponse | null>(null);
  dashboardService = inject(DashboardService);
  constructor() {
    this.dashboardService.getDashboardData().subscribe((data) => {
      this.dashboardState.set(data);
    });
  }
}
