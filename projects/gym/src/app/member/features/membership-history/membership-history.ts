import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { catchError, of } from 'rxjs';
import { MemberSubscription } from '../../shared/models/member-area.models';
import { MemberService } from '../../../shared/services/member.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';


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

  activeTimeLineHistory = signal<MemberSubscription[]>([]);

  loading = signal(true);

  showAll = signal(false);




  constructor() {
    this.memberService.getMe().subscribe({
      next: (profile) =>
        this.subscriptionService
          .getHistory(profile.memberId)
          .pipe(catchError(() => of([])))
          .subscribe((history) => {
            const sortedHistory = [...history].sort(
              (a, b) =>
                new Date(b.startDate).getTime() -
                new Date(a.startDate).getTime()
            );

            this.history.set(sortedHistory);

            this.updateDisplayedHistory();

            this.finishLoading();
          }),

      error: () => this.finishLoading(),
    });
  }

  toggleShowAll(): void {
    this.showAll.update(value => !value);
    this.updateDisplayedHistory();
  }

  private updateDisplayedHistory(): void {
    if (this.showAll()) {
      this.activeTimeLineHistory.set(this.history());
      return;
    }

    this.activeTimeLineHistory.set(
      this.history().filter(subscription =>
        ['Active', 'Frozen', 'Scheduled'].includes(
          String(subscription.status)
        )
      )
    );
  }

  private finishLoading(): void {
    const remaining = Math.max(
      0,
      240 - (Date.now() - this.loadingStartedAt)
    );

    window.setTimeout(
      () => this.loading.set(false),
      remaining
    );
  }

  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return status === 'Active' || status === 'Paid'
      ? 'success'
      : status === 'Pending' || status === 'Scheduled'
        ? 'warn'
        : status === 'Frozen'
          ? 'info'
          : 'danger';
  }
}

