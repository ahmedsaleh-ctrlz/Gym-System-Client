import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, debounceTime, distinctUntilChanged, finalize, of, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MembersService } from '../members/services/members-service';
import { Member } from '../members/models/member.models';
import { PlanService } from '../../../shared/services/plan.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';
import { Plan } from '../../../shared/models/plan.models';
import { Subscription, SubscriptionFilters } from '../../../shared/models/subscription.models';
import { Avatar } from 'primeng/avatar';
import { resolveImageUrl } from '../../../shared/image-url';

type SubscriptionAction = 'activate' | 'schedule' | 'cancel';

@Component({
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    Avatar,
  ],
  providers: [ConfirmationService, MessageService],
  selector: 'app-subscriptions',
  styleUrl: './subscriptions.scss',
  templateUrl: './subscriptions.html',
})
export class Subscriptions {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(SubscriptionService);
  private readonly planService = inject(PlanService);
  private readonly membersService = inject(MembersService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  subscriptions = signal<Subscription[]>([]);
  plans = signal<Plan[]>([]);
  members = signal<Member[]>([]);
  total = signal(0);
  loading = signal(true);
  referenceLoading = signal(false);
  actionLoading = signal<number | null>(null);
  searchTerm = signal('');
  statusFilter = signal('');
  planFilter = signal('');
  startDateFrom = signal('');
  startDateTo = signal('');
  endDateFrom = signal('');
  endDateTo = signal('');
  sortDirection = signal<'asc' | 'desc'>('desc');
  private readonly searchChanges = new Subject<string>();
  private readonly memberSearchChanges = new Subject<string>();
  private readonly destroyRef = inject(DestroyRef);
  memberSearchTerm = signal('');
  memberSearchResults = signal<Member[]>([]);
  memberSearchLoading = signal(false);
  memberPickerOpen = signal(false);
  selectedMember = signal<Member | null>(null);
  filtersVisible = signal(false);
  pageNumber = 1;
  pageSize = 10;
  selectedSubscription = signal<Subscription | null>(null);
  selectedHistory = signal<Subscription[]>([]);
  detailsVisible = false;
  createVisible = false;
  renewVisible = false;
  freezeVisible = false;
  createForm = this.fb.nonNullable.group({
    memberId: [0, Validators.min(1)],
    planId: [0, Validators.min(1)],
    startDate: [this.today(), Validators.required],
  });
  renewForm = this.fb.nonNullable.group({
    memberId: [0, Validators.min(1)],
    planId: [0, Validators.min(1)],
  });
  freezeForm = this.fb.nonNullable.group({
    freezeDays: [7, [Validators.required, Validators.min(1), Validators.max(365)]],
  });

  constructor() {
    this.searchChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value);
        this.loadSubscriptions(1);
      });
    this.memberSearchChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.loadMemberMatches(value));
    this.loadSubscriptions();
    this.loadReferenceData();
  }
  loadSubscriptions(page = this.pageNumber): void {
    this.loading.set(true);
    this.pageNumber = page;
    this.service.getSubscriptions(this.currentFilters()).subscribe({
      next: (response) => {
        this.subscriptions.set(response.items ?? []);
        this.total.set(response.totalCount ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifyError('Could not load subscriptions', 'Check the API connection and try again.');
      },
    });
  }
  applySearch(value: string): void {
    this.searchChanges.next(value);
  }
  applyFilters(): void {
    this.loadSubscriptions(1);
  }
  clearFilters(): void {
    this.searchChanges.next('');
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.planFilter.set('');
    this.startDateFrom.set('');
    this.startDateTo.set('');
    this.endDateFrom.set('');
    this.endDateTo.set('');
    this.loadSubscriptions(1);
  }
  toggleSort(): void {
    this.sortDirection.update((direction) => (direction === 'desc' ? 'asc' : 'desc'));
    this.loadSubscriptions(1);
  }
  loadReferenceData(): void {
    this.referenceLoading.set(true);
    this.planService
      .getPlans(1, 100, '', 'title', 'asc')
      .pipe(catchError(() => of({ pageNumber: 1, pageSize: 100, totalCount: 0, items: [] })))
      .subscribe((response) => this.plans.set(response.items.filter((plan) => plan.isActive)));
    this.membersService
      .getMembers(1, 100, '')
      .pipe(catchError(() => of({ pageNumber: 1, pageSize: 100, totalCount: 0, items: [] })))
      .subscribe((response) => {
        this.members.set(response.items);
        this.referenceLoading.set(false);
      });
  }
  openCreate(): void {
    this.createForm.reset({ memberId: 0, planId: 0, startDate: this.today() });
    this.clearMemberSearch();
    this.createVisible = true;
  }
  searchMembers(value: string): void {
    const searchTerm = value.trimStart();
    this.memberSearchTerm.set(searchTerm);
    this.createForm.controls.memberId.setValue(0);
    this.selectedMember.set(null);
    this.memberSearchLoading.set(searchTerm.trim().length > 0);
    this.memberPickerOpen.set(true);
    this.memberSearchChanges.next(searchTerm);
  }
  selectMember(member: Member): void {
    this.createForm.controls.memberId.setValue(member.memberId);
    this.createForm.controls.memberId.markAsTouched();
    this.selectedMember.set(member);
    this.memberSearchTerm.set(this.fullName(member));
    this.memberPickerOpen.set(false);
  }
  clearMemberSearch(): void {
    this.createForm.controls.memberId.setValue(0);
    this.memberSearchTerm.set('');
    this.memberSearchResults.set([]);
    this.selectedMember.set(null);
    this.memberPickerOpen.set(false);
  }
  private loadMemberMatches(value: string): void {
    const searchTerm = value.trim();
    if (!searchTerm) {
      this.memberSearchResults.set([]);
      this.memberSearchLoading.set(false);
      this.memberPickerOpen.set(false);
      return;
    }

    this.memberSearchLoading.set(true);
    this.membersService
      .getMembers(1, 20, searchTerm)
      .pipe(
        catchError(() => of({ pageNumber: 1, pageSize: 20, totalCount: 0, items: [] })),
        finalize(() => this.memberSearchLoading.set(false)),
      )
      .subscribe((response) => {
        this.memberSearchResults.set(response.items ?? []);
        this.memberPickerOpen.set(true);
      });
  }
  openRenew(subscription: Subscription): void {
    this.renewForm.reset({ memberId: subscription.memberId, planId: 0 });
    this.renewVisible = true;
  }
  openFreeze(subscription: Subscription): void {
    this.selectedSubscription.set(subscription);
    this.freezeForm.reset({ freezeDays: 7 });
    this.freezeVisible = true;
  }
  createSubscription(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.service.create(this.createForm.getRawValue()).subscribe({
      next: () => {
        this.createVisible = false;
        this.notifySuccess('Subscription created', 'The new subscription is ready for payment.');
        this.loadSubscriptions();
      },
      error: (error) => this.notifyError('Could not create subscription', this.apiMessage(error)),
    });
  }
  renewSubscription(): void {
    if (this.renewForm.invalid) {
      this.renewForm.markAllAsTouched();
      return;
    }
    this.confirmation.confirm({
      header: 'Confirm renewal',
      message:
        'Renew this member with the selected plan? This creates a new subscription and may schedule it after the current one.',
      icon: 'pi pi-refresh',
      acceptLabel: 'Renew subscription',
      rejectLabel: 'Review again',
      accept: () =>
        this.service.renew(this.renewForm.getRawValue()).subscribe({
          next: () => {
            this.renewVisible = false;
            this.notifySuccess(
              'Renewal created',
              'The member’s next subscription has been created.',
            );
            this.loadSubscriptions();
          },
          error: (error) => this.notifyError('Renewal failed', this.apiMessage(error)),
        }),
    });
  }
  runAction(subscription: Subscription, action: SubscriptionAction): void {
    this.actionLoading.set(subscription.subscriptionId);
    const request =
      action === 'activate'
        ? this.service.activate(subscription.subscriptionId)
        : action === 'schedule'
          ? this.service.schedule(subscription.subscriptionId)
          : this.service.cancel(subscription.subscriptionId);
    request.subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.notifySuccess(
          'Subscription updated',
          `${this.actionLabel(action)} completed successfully.`,
        );
        this.loadSubscriptions();
        if (this.detailsVisible) this.detailsVisible = false;
      },
      error: (error) => {
        this.actionLoading.set(null);
        this.notifyError(`${this.actionLabel(action)} failed`, this.apiMessage(error));
      },
    });
  }
  confirmAction(subscription: Subscription, action: SubscriptionAction): void {
    const important = action === 'cancel';
    this.confirmation.confirm({
      header: `${this.actionLabel(action)} subscription`,
      message: important
        ? `Cancel ${subscription.memberName}’s ${subscription.planName} subscription? This is an important account change.`
        : `${this.actionLabel(action)} ${subscription.memberName}’s ${subscription.planName} subscription?`,
      icon: important ? 'pi pi-exclamation-triangle' : 'pi pi-info-circle',
      acceptLabel: this.actionLabel(action),
      rejectLabel: 'Keep as is',
      acceptButtonStyleClass: important ? 'p-button-danger' : undefined,
      accept: () => this.runAction(subscription, action),
    });
  }
  freezeSubscription(): void {
    const subscription = this.selectedSubscription();
    if (!subscription || this.freezeForm.invalid) {
      this.freezeForm.markAllAsTouched();
      return;
    }
    this.service.freeze(subscription.subscriptionId, this.freezeForm.getRawValue()).subscribe({
      next: () => {
        this.freezeVisible = false;
        this.notifySuccess(
          'Subscription frozen',
          `${this.freezeForm.controls.freezeDays.value} days have been added to the freeze period.`,
        );
        this.loadSubscriptions();
      },
      error: (error) => this.notifyError('Freeze failed', this.apiMessage(error)),
    });
  }
  viewDetails(subscription: Subscription): void {
    this.selectedSubscription.set(subscription);
    this.selectedHistory.set([]);
    this.detailsVisible = true;
    this.service
      .getMemberHistory(subscription.memberId)
      .pipe(catchError(() => of([])))
      .subscribe((history) => this.selectedHistory.set(history));
  }
  canActivate(status: string): boolean {
    return ['Pending', 'Scheduled', 'Frozen'].includes(status);
  }
  canSchedule(status: string): boolean {
    return ['Pending', 'Active'].includes(status);
  }
  canFreeze(status: string): boolean {
    return status === 'Active';
  }
  canCancel(status: string): boolean {
    return ['Pending', 'Scheduled', 'Active', 'Frozen'].includes(status);
  }
  fullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`.trim();
  }
  selectedPlan(planId: number): Plan | undefined {
    return this.plans().find((plan) => plan.planId === Number(planId));
  }
  projectedEndDate(): string {
    const plan = this.selectedPlan(this.createForm.controls.planId.value);
    const start = this.createForm.controls.startDate.value;
    if (!plan || !start) return '';
    const end = new Date(`${start}T00:00:00`);
    end.setDate(end.getDate() + plan.durationInDays - 1);
    return end.toISOString();
  }
  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return status === 'Active'
      ? 'success'
      : status === 'Scheduled'
        ? 'info'
        : status === 'Frozen' || status === 'Pending'
          ? 'warn'
          : 'danger';
  }
  actionLabel(action: SubscriptionAction): string {
    return action.charAt(0).toUpperCase() + action.slice(1);
  }
  today(): string {
    return new Date().toISOString().slice(0, 10);
  }
  apiMessage(error: { error?: { title?: string } }): string {
    return error?.error?.title ?? 'Please try again and review the server response.';
  }
  notifySuccess(summary: string, detail: string): void {
    this.messages.add({ severity: 'success', summary, detail });
  }
  notifyError(summary: string, detail: string): void {
    this.messages.add({ severity: 'error', summary, detail });
  }
  statusCount(status: string): number {
    return this.subscriptions().filter((item) => item.status === status).length;
  }
  pageRevenue(): number {
    return this.subscriptions().reduce((total, item) => total + item.price, 0);
  }
  private currentFilters(): SubscriptionFilters {
    return {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm(),
      status: this.statusFilter(),
      planName: this.planFilter(),
      startDateFrom: this.startDateFrom(),
      startDateTo: this.startDateTo(),
      endDateFrom: this.endDateFrom(),
      endDateTo: this.endDateTo(),
      sortBy: 'Id',
      sortDirection: this.sortDirection(),
    };
  }

  getMemberImageUrl(memberId: number): string | undefined {
    return (
      resolveImageUrl(this.members().find((member) => member.memberId === memberId)?.imageUrl) ??
      undefined
    );
  }

  memberImageUrl(imageUrl: string | null): string | undefined {
    return resolveImageUrl(imageUrl) ?? undefined;
  }
}
