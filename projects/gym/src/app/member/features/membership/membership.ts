import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { catchError, forkJoin, of } from 'rxjs';
import {
  MemberProfile,
  MemberPlan,
  MemberSubscription,
} from '../../shared/models/member-area.models';
import { MemberService } from '../../../shared/services/member.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';
import { PlanService } from '../../../shared/services/plan.service';
import { daysBetween, membershipProgress, statusSeverity } from '../../shared/member.helpers';

@Component({
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ToastModule,
  ],
  providers: [MessageService],
  selector: 'app-member-membership',
  styleUrl: './membership.scss',
  templateUrl: './membership.html',
})
export class Membership {
  private readonly memberService = inject(MemberService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly planService = inject(PlanService);
  private readonly messages = inject(MessageService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  profile = signal<MemberProfile | null>(null);
  subscription = signal<MemberSubscription | null>(null);
  plans = signal<MemberPlan[]>([]);
  loading = signal(true);
  saving = signal(false);
  freezeVisible = false;
  renewVisible = false;
  renewStep = signal<'choose' | 'review'>('choose');
  selectedPlan = signal<MemberPlan | null>(null);
  freezeForm = this.fb.nonNullable.group({
    freezeDays: [7, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.memberService.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        forkJoin({
          subscription: this.subscriptionService.getActive(profile.memberId),
          plans: this.planService.getMemberOptions().pipe(catchError(() => of({ items: [] }))),
        }).subscribe(({ subscription, plans }) => {
          this.subscription.set(subscription);
          this.plans.set((plans.items ?? []).filter((plan) => plan.isActive));
          this.loading.set(false);
        });
      },
      error: () => {
        this.loading.set(false);
        this.notify(
          'error',
          'Membership unavailable',
          'We could not load your membership right now.',
        );
      },
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

  canFreeze(): boolean {
    return this.subscription()?.status.toLowerCase() === 'active';
  }

  openFreeze(): void {
    this.freezeForm.reset({ freezeDays: 7 });
    this.freezeVisible = true;
  }

  freeze(): void {
    const current = this.subscription();
    if (!current || this.freezeForm.invalid) {
      this.freezeForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.subscriptionService
      .freeze(current.subscriptionId, this.freezeForm.getRawValue())
      .subscribe({
        next: () => {
          this.freezeVisible = false;
          this.saving.set(false);
          this.notify(
            'success',
            'Membership frozen',
            'Your membership has been updated successfully.',
          );
          this.load();
        },
        error: (error) => {
          this.saving.set(false);
          this.notify(
            'error',
            'Could not freeze membership',
            error?.error?.detail ??
              error?.error?.title ??
              'Please review the number of days and try again.',
          );
        },
      });
  }

  openRenew(): void {
    if (!this.subscription()) {
      this.goToPlans();
      return;
    }
    this.selectedPlan.set(null);
    this.renewStep.set('choose');
    this.renewVisible = true;
  }

  goToPlans(): void {
    this.router.navigate(['/member/plans']);
  }

  choosePlan(plan: MemberPlan): void {
    this.selectedPlan.set(plan);
  }

  reviewRenewal(): void {
    if (this.selectedPlan()) this.renewStep.set('review');
  }

  backToPlanChoice(): void {
    this.renewStep.set('choose');
  }

  renew(): void {
    const profile = this.profile();
    const plan = this.selectedPlan();
    if (!profile || !plan) return;
    this.saving.set(true);
    this.subscriptionService.renew({ memberId: profile.memberId, planId: plan.planId }).subscribe({
      next: () => {
        this.renewVisible = false;
        this.saving.set(false);
        this.notify(
          'success',
          'Renewal started',
          'Your next membership has been created. Check payments for the next step.',
        );
        this.router.navigate(['/member/payments'], {
          queryParams: { pending: 1, planId: plan.planId },
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.notify(
          'error',
          'Renewal unavailable',
          error?.error?.detail ?? error?.error?.title ?? 'Please try again later.',
        );
      },
    });
  }

  notify(severity: 'success' | 'error', summary: string, detail: string): void {
    this.messages.add({ severity, summary, detail });
  }

  statusSeverity = statusSeverity;
}

