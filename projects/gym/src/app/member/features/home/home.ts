import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { catchError, forkJoin, of } from 'rxjs';
import { AuthService } from 'auth';
import {
  daysBetween,
  memberFullName,
  memberImageUrl,
  memberInitials,
  membershipProgress,
  statusSeverity,
} from '../../shared/member.helpers';
import {
  MemberPayment,
  MemberProfile,
  MemberSubscription,
} from '../../shared/models/member-area.models';
import { AttendanceRecord } from '../../../shared/models/attendance.models';
import { AttendanceApiService } from '../../../shared/services/attendance-api.service';
import { PaymentService } from '../../../shared/services/payment.service';
import { MemberService } from '../../../shared/services/member.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';

@Component({
  imports: [DatePipe, DecimalPipe, RouterLink, AvatarModule, ButtonModule, TagModule],
  selector: 'app-member-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  private readonly auth = inject(AuthService);
  private readonly memberService = inject(MemberService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly paymentService = inject(PaymentService);
  private readonly attendanceService = inject(AttendanceApiService);

  profile = signal<MemberProfile | null>(null);
  subscription = signal<MemberSubscription | null>(null);
  latestPayment = signal<MemberPayment | null>(null);
  pendingPayment = signal<MemberPayment | null>(null);
  latestAttendance = signal<AttendanceRecord | null>(null);
  recentAttendance = signal<AttendanceRecord[]>([]);
  loading = signal(true);
  hasError = signal(false);

  readonly imageUrl = memberImageUrl;
  readonly initials = memberInitials;
  readonly fullName = memberFullName;
  readonly statusSeverity = statusSeverity;

  constructor() {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.hasError.set(false);
    this.memberService
      .getMe()
      .pipe(
        catchError(() => {
          this.hasError.set(true);
          return of(null);
        }),
      )
      .subscribe((profile) => {
        if (!profile) {
          this.loading.set(false);
          return;
        }
        this.profile.set(profile);
        const memberId = profile.memberId || this.auth.getCurrentUserId();
        if (!memberId) {
          this.loading.set(false);
          this.hasError.set(true);
          return;
        }
        forkJoin({
          subscription: this.subscriptionService.getActive(memberId),
          payments: this.paymentService.getHistory(memberId).pipe(catchError(() => of([]))),
          attendance: this.attendanceService
            .getMemberHistory(memberId, 1, 5)
            .pipe(catchError(() => of({ items: [], totalCount: 0, pageNumber: 1, pageSize: 5 }))),
        }).subscribe(({ subscription, payments, attendance }) => {
          const activeSubscription = subscription?.status?.toLowerCase() === 'active' ? subscription : null;
          this.subscription.set(activeSubscription);
          this.latestPayment.set(payments[0] ?? null);
          this.pendingPayment.set(payments.find((payment) => payment.status.toLowerCase() === 'pending') ?? null);
          this.recentAttendance.set(attendance.items ?? []);
          this.latestAttendance.set(attendance.items?.[0] ?? null);
          this.loading.set(false);
        });
      });
  }

  daysRemaining(): number {
    const item = this.subscription();
    return item ? daysBetween(item.startDate, item.endDate) : 0;
  }

  progress(): number {
    const item = this.subscription();
    return item ? membershipProgress(item.startDate, item.endDate) : 0;
  }

  visitLabel(): string {
    return this.latestAttendance() ? 'Latest visit' : 'Your first visit is waiting';
  }

  membershipCta(): string {
    if (this.pendingPayment()) return 'Complete payment';
    const status = this.subscription()?.status.toLowerCase();
    return status === 'expired' ? 'Renew membership' : status === 'pending' ? 'Complete payment' : 'Manage membership';
  }

  membershipRoute(): string {
    return this.pendingPayment() ? '/member/payments' : '/member/membership';
  }
}

