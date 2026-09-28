import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { catchError, distinctUntilChanged, finalize, forkJoin, of } from 'rxjs';
import { Payment } from '../../../../../shared/models/payment.models';
import { PaymentService } from '../../../../../shared/services/payment.service';
import { PromoCodeService } from '../../../../../shared/services/promo-code.service';
import { SubscriptionService } from '../../../../../shared/services/subscription.service';
import { Subscription } from '../../../../../shared/models/subscription.models';
import { PromoCodeResponse, PromoDiscountType } from '../../../../../shared/models/promo-code.models';

@Component({
  imports: [Dialog, ReactiveFormsModule, DecimalPipe, Button],
  selector: 'app-pay-payment',
  styleUrl: './pay-payment.scss',
  templateUrl: './pay-payment.html',
})
export class PayPayment {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messages = inject(MessageService);
  private readonly paymentService = inject(PaymentService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly subscriptionService = inject(SubscriptionService);

  readonly paymentId = input.required<number>();
  readonly visible = model(false);
  readonly completed = output<void>();

  readonly selectedPayment = signal<Payment | null>(null);
  readonly subscriptionPlanId = signal<number | null>(null);
  readonly actionLoading = signal(false);
  readonly promoLoading = signal(false);
  readonly promoPreview = signal<PromoCodeResponse | null>(null);
  readonly promoError = signal<string | null>(null);

  readonly paymentMethods = [
    { label: 'Cash', value: 0 },
    { label: 'Visa', value: 1 },
    { label: 'E-Wallet', value: 2 },
    { label: 'Insta Pay', value: 3 },
    { label: 'Fawry', value: 4 },
  ];

  readonly payForm = this.fb.nonNullable.group({
    paymentMethod: [0, Validators.required],
    paymentReference: [''],
    promoCode: [''],
  });

  private readonly paymentReference = this.payForm.controls.paymentReference;

  private readonly paymentEffect = effect(() => {
    const id = this.paymentId();
    this.clearPromoPreview();
    this.loadPayment(id);
  });

  private readonly visibilityEffect = effect(() => {
    if (this.visible()) {
      this.resetPaymentForm();
    }
  });

  constructor() {
    this.updatePaymentReferenceValidation();
  }

  loadPayment(id = this.paymentId()): void {
    this.resetPaymentForm();
    this.selectedPayment.set(null);
    this.subscriptionPlanId.set(null);
    this.paymentService.getPayment(id).subscribe({
      next: (payment) => {
        this.selectedPayment.set(payment);
        this.loadSubscriptionPlan(payment);
      },
      error: (error) => this.messages.add({
        severity: 'error',
        summary: 'Could not load payment',
        detail: this.apiMessage(error),
      }),
    });
  }

  payPayment(): void {
    if (this.payForm.invalid) {
      this.payForm.markAllAsTouched();
      return;
    }

    const code = this.promoCodeValue();
    if (code && !this.promoPreview()) {
      this.promoError.set('Apply a valid promo code before recording this payment.');
      return;
    }

    this.actionLoading.set(true);
    this.paymentService
      .pay({
        paymentId: this.paymentId(),
        paymentMethod: this.payForm.controls.paymentMethod.value,
        paymentReference: this.payForm.controls.paymentReference.value.trim() || null,
        promoCodeId: this.promoPreview()?.id ?? null,
      })
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.visible.set(false);
          this.messages.add({
            severity: 'success',
            summary: 'Payment recorded',
            detail: 'The payment was successfully recorded.',
          });
          this.completed.emit();
        },
        error: (error) => this.messages.add({
          severity: 'error',
          summary: 'Payment failed',
          detail: this.apiMessage(error),
        }),
      });
  }

  previewPromoCode(): void {
    const code = this.promoCodeValue();
    const payment = this.selectedPayment();
    if (!code) {
      this.promoError.set('Enter a promo code first.');
      this.promoPreview.set(null);
      return;
    }
    if (!payment) {
      this.promoError.set('Payment details are still loading. Please try again.');
      return;
    }
    if (!this.subscriptionPlanId()) {
      this.promoError.set('This payment is missing its plan information. Please refresh and try again.');
      return;
    }

    this.promoLoading.set(true);
    this.promoError.set(null);
    this.promoPreview.set(null);
    this.promoCodeService
      .previewPromoCode({
        promoCode: code,
        memberId: payment.memberId,
        planId: this.subscriptionPlanId()!,
      })
      .pipe(finalize(() => this.promoLoading.set(false)))
      .subscribe({
        next: (promo) => {
          if (!promo.isActive) {
            this.promoError.set('This promo code is no longer active.');
            return;
          }

          const minimum = promo.minimumPurchaseAmount;
          if (minimum !== null && this.paymentAmount() < minimum) {
            this.promoError.set(`This code requires a minimum purchase of ${minimum} EGP.`);
            return;
          }

          this.promoPreview.set(promo);
        },
        error: (error) => this.promoError.set(this.apiMessage(error, 'Promo code could not be applied.')),
      });
  }

  clearPromoCode(): void {
    this.payForm.controls.promoCode.setValue('');
    this.clearPromoPreview();
  }

  onPromoCodeInput(): void {
    this.clearPromoPreview();
  }

  requirePaymentReference(): boolean {
    const method = this.payForm.controls.paymentMethod.value;
    return method === 2 || method === 3;
  }

  paymentReferenceLabel(): string {
    return this.payForm.controls.paymentMethod.value === 2
      ? 'E-Wallet reference'
      : 'Insta Pay reference';
  }

  paymentAmount(): number {
    return this.selectedPayment()?.amount ?? 0;
  }

  discountAmount(): number {
    const promo = this.promoPreview();
    if (!promo) return 0;

    const amount = this.paymentAmount();
    const discount = this.isPercentagePromo(promo)
      ? (amount * promo.discountValue) / 100
      : promo.discountValue;
    const capped = promo.maxDiscount == null ? discount : Math.min(discount, promo.maxDiscount);
    return Math.max(0, Math.min(capped, amount));
  }

  finalAmount(): number {
    return Math.max(0, this.paymentAmount() - this.discountAmount());
  }

  discountLabel(): string {
    const promo = this.promoPreview();
    if (!promo) return '';
    return this.isPercentagePromo(promo)
      ? `${promo.discountValue}% off`
      : `${promo.discountValue} EGP off`;
  }

  private updatePaymentReferenceValidation(): void {
    this.payForm.controls.paymentMethod.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.requirePaymentReference()) {
          this.paymentReference.setValidators(Validators.required);
        } else {
          this.paymentReference.clearValidators();
        }
        this.paymentReference.updateValueAndValidity({ emitEvent: false });
      });
  }

  private promoCodeValue(): string {
    return this.payForm.controls.promoCode.value.trim();
  }

  private clearPromoPreview(): void {
    this.promoPreview.set(null);
    this.promoError.set(null);
  }

  private resetPaymentForm(): void {
    this.payForm.reset({ paymentMethod: 0, paymentReference: '', promoCode: '' });
    this.clearPromoPreview();
  }

  private loadSubscriptionPlan(payment: Payment): void {
    forkJoin({
      current: this.subscriptionService.getMemberSubscription(payment.memberId).pipe(catchError(() => of(null))),
      history: this.subscriptionService.getMemberHistory(payment.memberId).pipe(catchError(() => of([] as Subscription[]))),
    }).subscribe(({ current, history }) => {
      const subscriptions = current ? [current, ...history] : history;
      const subscription = subscriptions.find((item) => item.subscriptionId === payment.subscriptionId);
      this.subscriptionPlanId.set(subscription?.planId ?? null);
    });
  }

  private isPercentagePromo(promo: PromoCodeResponse): boolean {
    return promo.discountType === PromoDiscountType.Percentage ||
      String(promo.discountType).toLowerCase() === 'percentage';
  }

  private apiMessage(error: unknown, fallback = 'Please review the server response and try again.'): string {
    const response = error as {
      error?: {
        title?: string;
        detail?: string;
        message?: string;
        code?: string;
        errorCode?: string;
      } | string;
      message?: string;
    };
    const payload = response?.error;
    if (typeof payload === 'string') return this.friendlyPromoError(payload);
    const raw = payload?.detail ?? payload?.message ?? payload?.code ?? payload?.errorCode ?? payload?.title ?? response?.message;
    return raw ? this.friendlyPromoError(raw) : fallback;
  }

  private friendlyPromoError(value: string): string {
    const normalized = value.replace(/[_-]/g, '').toLowerCase();
    if (normalized.includes('notapplicable') && normalized.includes('plan')) {
      return 'This promo code is not applicable to the selected plan.';
    }
    if (normalized.includes('newmember')) {
      return 'This promo code is available only for new members.';
    }
    if (normalized.includes('expired')) return 'This promo code has expired.';
    if (normalized.includes('usagelimit')) return 'This promo code has reached its usage limit.';
    return value;
  }
}
