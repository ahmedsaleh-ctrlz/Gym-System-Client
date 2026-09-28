import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AttendanceRecord } from '../../../shared/models/attendance.models';
import { MemberService } from '../../../shared/services/member.service';
import { AttendanceApiService } from '../../../shared/services/attendance-api.service';

@Component({
  imports: [DatePipe, ButtonModule, InputTextModule, TableModule],
  selector: 'app-member-attendance',
  styleUrl: './attendance.scss',
  templateUrl: './attendance.html',
})
export class MemberAttendancePage {
  private readonly memberService = inject(MemberService);
  private readonly attendanceService = inject(AttendanceApiService);
  records = signal<AttendanceRecord[]>([]);
  total = signal(0);
  loading = signal(true);
  dateFrom = signal('');
  dateTo = signal('');
  pageNumber = 1;
  pageSize = 10;

  constructor() {
    this.load();
  }

  load(page = this.pageNumber): void {
    this.loading.set(true);
    this.pageNumber = page;
    this.memberService.getMe().subscribe({
      next: (member) => this.attendanceService.getMemberHistory(member.memberId, page, this.pageSize, this.dateFrom(), this.dateTo()).subscribe({
        next: (response) => {
          this.records.set(response.items ?? []);
          this.total.set(response.totalCount ?? 0);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
      error: () => this.loading.set(false),
    });
  }

  applyFilters(): void {
    this.load(1);
  }

  monthVisits(): number {
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    return this.records().filter((item) => {
      const date = new Date(item.checkInAtUtc);
      return date.getMonth() === month && date.getFullYear() === year;
    }).length;
  }
}

