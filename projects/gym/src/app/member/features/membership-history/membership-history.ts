import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { catchError, of } from 'rxjs';
import { MemberSubscription } from '../../shared/models/member-area.models';
import { MemberService } from '../../../shared/services/member.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';
import { statusSeverity } from '../../shared/member.helpers';

@Component({
  imports: [DatePipe, DecimalPipe, TagModule],
  selector: 'app-member-membership-history',
  styleUrl: './membership-history.scss',
  templateUrl: './membership-history.html',
})
export class MembershipHistory {
  private readonly memberService = inject(MemberService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly loadingStartedAt = Date.now();
  history = signal<MemberSubscription[]>([]);
  loading = signal(true);
  statusSeverity = statusSeverity;

  constructor() {
    this.memberService.getMe().subscribe({
      next: (profile) => this.subscriptionService.getHistory(profile.memberId).pipe(catchError(() => of([]))).subscribe((history) => {
        this.history.set([...history].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        this.finishLoading();
      }),
      error: () => this.finishLoading(),
    });
  }

  private finishLoading(): void {
    const remaining = Math.max(0, 240 - (Date.now() - this.loadingStartedAt));
    window.setTimeout(() => this.loading.set(false), remaining);
  }
}

