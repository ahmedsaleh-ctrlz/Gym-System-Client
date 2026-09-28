import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { catchError, forkJoin, of } from 'rxjs';
import {
  MemberPlan,
  MemberProfile,
  MemberSubscription,
} from '../../shared/models/member-area.models';
import { MemberService } from '../../../shared/services/member.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';
import { PlanService } from '../../../shared/services/plan.service';

@Component({
  imports: [DecimalPipe, ButtonModule, DialogModule, InputTextModule, TagModule, ToastModule],
  providers: [MessageService],
  selector: 'app-member-plans',
  styleUrl: './plans.scss',
  templateUrl: './plans.html',
})
export class MemberPlans {
  private readonly memberService = inject(MemberService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly planService = inject(PlanService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  profile = signal<MemberProfile | null>(null);
  currentSubscription = signal<MemberSubscription | null>(null);
  plans = signal<MemberPlan[]>([]);
  loading = signal(true);
  saving = signal(false);
  reviewVisible = false;
  selectedPlan = signal<MemberPlan | null>(null);
  startDate = signal(this.toDateInput(new Date()));
  readonly minStartDate = this.toDateInput(new Date());
  readonly maxStartDate = this.toDateInput(this.addDays(new Date(), 14));

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.memberService
      .getMe()
      .pipe(catchError(() => of(null)))
      .subscribe((profile) => {
        if (!profile) {
          this.loading.set(false);
          return;
        }
        this.profile.set(profile);
        forkJoin({
          current: this.subscriptionService.getRenewable(profile.memberId),
          plans: this.planService.getMemberOptions().pipe(catchError(() => of({ items: [] }))),
        }).subscribe(({ current, plans }) => {
          this.currentSubscription.set(current);
          this.plans.set((plans.items ?? []).filter((plan) => plan.isActive));
          this.loading.set(false);
        });
      });
  }

  choosePlan(plan: MemberPlan): void {
    this.selectedPlan.set(plan);
    this.startDate.set(this.minStartDate);
    this.reviewVisible = true;
  }

  canRenewExisting(): boolean {
    const status = this.currentSubscription()?.status?.toLowerCase();
    return status === 'active' || status === 'scheduled' || status === 'frozen';
  }

  updateStartDate(value: string): void {
    this.startDate.set(value);
  }

  createSubscription(): void {
    const profile = this.profile();
    const plan = this.selectedPlan();
    if (!profile || !plan || this.saving()) return;

    const renewing = this.canRenewExisting();
    if (!renewing && !this.isStartDateValid()) {
      this.messages.add({
        severity: 'warn',
        summary: 'Choose a valid start date',
        detail: 'The start date must be today or within the next 14 days.',
      });
      return;
    }

    this.saving.set(true);
    const request$ = renewing
      ? this.subscriptionService.renew({ memberId: profile.memberId, planId: plan.planId })
      : this.subscriptionService.create({
          memberId: profile.memberId,
          planId: plan.planId,
          startDate: this.startDate(),
        });

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.reviewVisible = false;
        this.messages.add({
          severity: 'success',
          summary: renewing ? 'Renewal created' : 'Subscription created',
          detail: 'A pending payment is waiting for you in My Payments.',
        });
        this.router.navigate(['/member/payments'], {
          queryParams: { pending: 1, planId: plan.planId },
        });
      },
      error: (error) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not create subscription',
          detail: error?.error?.detail ?? error?.error?.title ?? 'Please try again later.',
        });
      },
    });
  }

  private isStartDateValid(): boolean {
    const value = this.startDate();
    return !!value && value >= this.minStartDate && value <= this.maxStartDate;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private toDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

