import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { Plan } from '../../../shared/models/plan.models';
import { PlanService } from '../../../shared/services/plan.service';
import { PromoCodeService } from '../../../shared/services/promo-code.service';
import {
  CreatePromoCodeRequest,
  PromoCodeAudience,
  PromoCodeResponse,
  PromoDiscountType,
} from '../../../shared/models/promo-code.models';

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
    TagModule,
    ToastModule,
  ],
  providers: [ConfirmationService, MessageService],
  selector: 'app-offers',
  styleUrl: './offers.scss',
  templateUrl: './offers.html',
})
export class Offers {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PromoCodeService);
  private readonly planService = inject(PlanService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();

  readonly promos = signal<PromoCodeResponse[]>([]);
  readonly plans = signal<Plan[]>([]);
  readonly loading = signal(true);
  readonly plansLoading = signal(true);
  readonly saving = signal(false);
  readonly actionLoading = signal<number | null>(null);
  readonly searchTerm = signal('');
  readonly activeFilter = signal<boolean | null>(null);
  readonly selectedPromo = signal<PromoCodeResponse | null>(null);
  readonly detailsVisible = signal(false);
  readonly createVisible = signal(false);

  readonly activeCount = computed(() => this.promos().filter((promo) => promo.isActive).length);
  readonly redemptionCount = computed(() =>
    this.promos().reduce((total, promo) => total + promo.usageCount, 0),
  );
  readonly plansCovered = computed(() => new Set(this.promos().map((promo) => promo.planId)).size);
  readonly expiringSoonCount = computed(
    () => this.promos().filter((promo) => promo.isActive && this.isExpiringSoon(promo)).length,
  );

  readonly discountTypes = [
    { label: 'Percentage', value: PromoDiscountType.Percentage },
    { label: 'Fixed amount', value: PromoDiscountType.FixedAmount },
  ];
  readonly audiences = [
    { label: 'Everyone', value: PromoCodeAudience.Everyone },
    { label: 'New members', value: PromoCodeAudience.NewMembers },
  ];

  readonly promoForm = this.fb.group({
    code: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(40),
    ]),
    planId: this.fb.nonNullable.control(0, [Validators.required, Validators.min(1)]),
    discountType: this.fb.nonNullable.control(PromoDiscountType.Percentage, Validators.required),
    discountValue: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0.01)]),
    maxDiscount: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    minimumPurchaseAmount: this.fb.control<number | null>(null, [Validators.min(0)]),
    audience: this.fb.nonNullable.control(PromoCodeAudience.Everyone, Validators.required),
    usageLimit: this.fb.nonNullable.control(1, [Validators.required, Validators.min(1)]),
    expiresAtLocal: this.fb.nonNullable.control('', Validators.required),
  });

  constructor() {
    this.searchChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value);
        this.loadPromos();
      });

    this.promoForm.controls.discountType.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.updateMaxDiscountValidation(value));

    this.updateMaxDiscountValidation(this.promoForm.controls.discountType.value);
    this.loadPromos();
    this.loadPlans();
  }

  loadPromos(): void {
    this.loading.set(true);
    this.service.getPromoCodes(this.activeFilter(), this.searchTerm()).subscribe({
      next: (promos) => {
        this.promos.set(promos ?? []);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.notifyError('Could not load offers', this.apiMessage(error));
      },
    });
  }

  loadPlans(): void {
    this.plansLoading.set(true);
    this.planService.getPlans(1, 100, '', 'title', 'asc').subscribe({
      next: (response) => {
        this.plans.set((response.items ?? []).filter((plan) => plan.isActive));
        this.plansLoading.set(false);
      },
      error: (error) => {
        this.plansLoading.set(false);
        this.notifyError('Could not load plans', this.apiMessage(error));
      },
    });
  }

  applySearch(value: string): void {
    this.searchChanges.next(value);
  }

  setStatusFilter(value: boolean | null): void {
    this.activeFilter.set(value);
    this.loadPromos();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.searchChanges.next('');
    this.loadPromos();
  }

  openCreate(): void {
    this.resetForm();
    this.createVisible.set(true);
  }

  createPromo(): void {
    if (this.promoForm.invalid) {
      this.promoForm.markAllAsTouched();
      return;
    }

    const value = this.promoForm.getRawValue();
    const expiresAt = new Date(value.expiresAtLocal);
    if (Number.isNaN(expiresAt.getTime())) {
      this.notifyError('Invalid expiration', 'Choose a valid expiration date and time.');
      return;
    }

    const request: CreatePromoCodeRequest = {
      code: value.code.trim().toUpperCase(),
      planId: value.planId,
      discountType: value.discountType,
      discountValue: value.discountValue,
      maxDiscount: value.maxDiscount,
      minimumPurchaseAmount: value.minimumPurchaseAmount,
      audience: value.audience,
      usageLimit: value.usageLimit,
      expiresAtUtc: expiresAt.toISOString(),
    };

    this.saving.set(true);
    this.service.createPromoCode(request).subscribe({
      next: () => {
        this.saving.set(false);
        this.createVisible.set(false);
        this.notifySuccess('Coupon created', `${request.code} is ready for your members.`);
        this.loadPromos();
      },
      error: (error) => {
        this.saving.set(false);
        this.notifyError('Could not create coupon', this.apiMessage(error));
      },
    });
  }

  viewDetails(promo: PromoCodeResponse): void {
    this.service.getPromoCode(promo.id).subscribe({
      next: (freshPromo) => {
        this.selectedPromo.set(freshPromo);
        this.detailsVisible.set(true);
      },
      error: (error) => this.notifyError('Could not load coupon details', this.apiMessage(error)),
    });
  }

  togglePromo(promo: PromoCodeResponse): void {
    const action = promo.isActive ? 'deactivate' : 'activate';
    this.confirmation.confirm({
      header: `${promo.isActive ? 'Disable' : 'Activate'} coupon`,
      message: `${promo.isActive ? 'Disable' : 'Activate'} ${promo.code}?`,
      icon: promo.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
      acceptLabel: promo.isActive ? 'Disable coupon' : 'Activate coupon',
      rejectLabel: 'Keep as is',
      acceptButtonStyleClass: promo.isActive ? 'p-button-danger' : 'p-button-success',
      accept: () => {
        this.actionLoading.set(promo.id);
        const request = promo.isActive
          ? this.service.deactivatePromoCode(promo.id)
          : this.service.activatePromoCode(promo.id);
        request.subscribe({
          next: () => {
            this.actionLoading.set(null);
            this.notifySuccess(
              promo.isActive ? 'Coupon disabled' : 'Coupon activated',
              `${promo.code} is now ${promo.isActive ? 'inactive' : 'active'}.`,
            );
            this.loadPromos();
          },
          error: (error) => {
            this.actionLoading.set(null);
            this.notifyError(`Could not ${action} coupon`, this.apiMessage(error));
          },
        });
      },
    });
  }

  copyCode(code: string): void {
    if (!navigator.clipboard) {
      this.notifyError('Copy unavailable', 'Your browser does not allow clipboard access here.');
      return;
    }
    navigator.clipboard.writeText(code).then(
      () => this.notifySuccess('Code copied', `${code} is ready to paste.`),
      () => this.notifyError('Could not copy code', 'Please copy the code manually.'),
    );
  }

  discountLabel(promo: PromoCodeResponse): string {
    return promo.discountType === PromoDiscountType.Percentage
      ? `${promo.discountValue}% off`
      : `${promo.discountValue} EGP off`;
  }

  discountIcon(promo: PromoCodeResponse): string {
    return promo.discountType === PromoDiscountType.Percentage
      ? 'pi pi-percentage'
      : 'pi pi-dollar';
  }

  audienceLabel(audience: PromoCodeAudience | string): string {
    return Number(audience) === PromoCodeAudience.NewMembers ||
      String(audience).toLowerCase() === 'newmembers'
      ? 'New members'
      : 'Everyone';
  }

  minimumPurchaseLabel(value: number | null | undefined): string {
    return value === null || value === undefined ? 'No minimum' : `${value} EGP minimum`;
  }

  maximumDiscountLabel(value: number | null | undefined): string {
    return value === null || value === undefined ? 'No cap' : `${value} EGP`;
  }

  statusLabel(promo: PromoCodeResponse): string {
    if (!promo.isActive) return 'Inactive';
    return this.isExpired(promo) ? 'Expired' : 'Active';
  }

  statusSeverity(promo: PromoCodeResponse): 'success' | 'warn' | 'secondary' {
    if (!promo.isActive) return 'secondary';
    return this.isExpired(promo) ? 'warn' : 'success';
  }

  usagePercent(promo: PromoCodeResponse): number {
    if (!promo.usageLimit) return 0;
    return Math.min(100, Math.round((promo.usageCount / promo.usageLimit) * 100));
  }

  isExpired(promo: PromoCodeResponse): boolean {
    return new Date(promo.expiresAtUtc).getTime() <= Date.now();
  }

  isExpiringSoon(promo: PromoCodeResponse): boolean {
    const expiration = new Date(promo.expiresAtUtc).getTime();
    return expiration > Date.now() && expiration <= Date.now() + 30 * 24 * 60 * 60 * 1000;
  }

  isInvalid(name: string): boolean {
    const control = this.promoForm.get(name);
    return !!control?.invalid && (control.dirty || control.touched);
  }

  error(name: string): string {
    const control = this.promoForm.get(name);
    if (control?.hasError('required')) return 'This field is required.';
    if (control?.hasError('minlength')) return 'Use at least 3 characters.';
    if (control?.hasError('min')) return 'Enter a valid positive value.';
    return 'Please check this field.';
  }

  private updateMaxDiscountValidation(type: PromoDiscountType): void {
    const control = this.promoForm.controls.maxDiscount;
    if (type === PromoDiscountType.Percentage) {
      control.enable({ emitEvent: false });
      control.setValidators(Validators.min(0.01));
    } else {
      control.reset(null, { emitEvent: false });
      control.clearValidators();
      control.disable({ emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private resetForm(): void {
    this.promoForm.reset({
      code: '',
      planId: 0,
      discountType: PromoDiscountType.Percentage,
      discountValue: 0,
      maxDiscount: null,
      minimumPurchaseAmount: null,
      audience: PromoCodeAudience.Everyone,
      usageLimit: 1,
      expiresAtLocal: '',
    });
    this.updateMaxDiscountValidation(PromoDiscountType.Percentage);
  }

  private apiMessage(error: unknown): string {
    const response = error as {
      error?: { title?: string; detail?: string; message?: string } | string;
    };
    if (typeof response?.error === 'string') return response.error;
    return (
      response?.error?.detail ??
      response?.error?.title ??
      response?.error?.message ??
      'Please try again and review the server response.'
    );
  }

  private notifySuccess(summary: string, detail: string): void {
    this.messages.add({ severity: 'success', summary, detail });
  }

  private notifyError(summary: string, detail: string): void {
    this.messages.add({ severity: 'error', summary, detail });
  }
}
