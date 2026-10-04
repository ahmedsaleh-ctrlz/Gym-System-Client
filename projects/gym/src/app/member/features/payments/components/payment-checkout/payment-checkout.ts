import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input,
  model,
  output,
  signal,
  computed,
  effect,
} from '@angular/core';
import { loadStripe, Stripe, StripeCardElement } from '@stripe/stripe-js';
import { appConfig } from 'config';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { MemberPayment, MemberSubscription } from '../../../../shared/models/member-area.models';
import { PaymentService } from '../../../../../shared/services/payment.service';
import { SubscriptionService } from '../../../../../shared/services/subscription.service';
import { PromoCodeService } from '../../../../../shared/services/promo-code.service';
import {
  PromoCodeResponse,
  PromoDiscountType,
} from '../../../../../shared/models/promo-code.models';
import {
  PAYMENT_METHOD,
  PAYMENT_METHOD_OPTIONS,
  PaymentMethodValue,
} from '../../../../../shared/models/payment.models';

@Component({
  imports: [DecimalPipe, ButtonModule, DialogModule, InputTextModule],
  selector: 'app-member-payment-checkout',
  styleUrl: './payment-checkout.scss',
  templateUrl: './payment-checkout.html',
})
export class MemberPaymentCheckout implements OnDestroy {
  private readonly paymentService = inject(PaymentService);
  private readonly promoCodeService = inject(PromoCodeService);
  private readonly subscriptionService = inject(SubscriptionService);
  readonly payment = input<MemberPayment | null>(null);
  readonly visible = model(false);
  readonly completed = output<MemberPayment>();
  readonly reviewSubmitted = output<MemberPayment>();
  readonly preparingChange = output<boolean>();
  @ViewChild('cardElement') cardHost?: ElementRef<HTMLDivElement>;
  readonly preparingPayment = signal(false);
  readonly paying = signal(false);
  readonly paymentError = signal('');
  readonly promoCode = signal('');
  readonly promoPreview = signal<PromoCodeResponse | null>(null);
  readonly promoError = signal('');
  readonly applyingPromo = signal(false);
  readonly submittingReview = signal(false);
  readonly reviewAttempted = signal(false);
  readonly reviewError = signal('');
  readonly paymentReference = signal('');
  readonly selectedPaymentMethod = signal<PaymentMethodValue>(PAYMENT_METHOD.Visa);
  readonly paymentMethods = PAYMENT_METHOD_OPTIONS.filter(
    (method) =>
      method.value === PAYMENT_METHOD.Visa ||
      method.value === PAYMENT_METHOD.EWallet ||
      method.value === PAYMENT_METHOD.InstaPay,
  );
  readonly discountAmount = computed(() => {
    const payment = this.payment(),
      promo = this.promoPreview();
    if (!payment || !promo) return 0;
    const discount = this.isPercentagePromo(promo)
      ? payment.amount * (promo.discountValue / 100)
      : promo.discountValue;
    const capped = promo.maxDiscount == null ? discount : Math.min(discount, promo.maxDiscount);
    return Math.max(0, Math.min(payment.amount, capped));
  });
  readonly finalAmount = computed(() =>
    Math.max(0, (this.payment()?.amount ?? 0) - this.discountAmount()),
  );
  private readonly openEffect = effect(() => {
    const payment = this.payment();
    const visible = this.visible();

    if (!visible) {
      this.initializedPaymentId = null;
      return;
    }

    if (!payment) return;

    if (this.initializedPaymentId === payment.paymentId) {
      return;
    }

    this.initializedPaymentId = payment.paymentId;

    this.loadSubscriptionPlan(payment);

    this.paymentError.set('');
    this.reviewError.set('');
    this.reviewAttempted.set(false);
    this.paymentReference.set('');
    this.selectedPaymentMethod.set(PAYMENT_METHOD.Visa);
    this.promoCode.set('');
    this.promoPreview.set(null);
    this.promoError.set('');

    this.prepareStripeIntent(null);
  });
  private stripe: Stripe | null = null;
  private card: StripeCardElement | null = null;
  private clientSecret = '';
  private subscriptionPlanId: number | null = null;
  private initializedPaymentId: number | null = null;
  isManualPayment(): boolean {
    return (
      this.selectedPaymentMethod() === PAYMENT_METHOD.EWallet ||
      this.selectedPaymentMethod() === PAYMENT_METHOD.InstaPay
    );
  }
  selectPaymentMethod(method: PaymentMethodValue): void {
    this.selectedPaymentMethod.set(method);
    this.reviewError.set('');
    this.reviewAttempted.set(false);
    this.destroyCard();
    this.clientSecret = '';
    if (method === PAYMENT_METHOD.Visa) {
      this.prepareStripeIntent(this.promoPreview()?.id ?? null);
    } else {
      this.preparingPayment.set(false);
      this.preparingChange.emit(false);
    }
  }
  setPaymentReference(event: Event): void {
    this.paymentReference.set((event.target as HTMLInputElement).value);
  }
  paymentReferenceLabel(): string {
    return this.selectedPaymentMethod() === PAYMENT_METHOD.EWallet
      ? 'E-Wallet payment reference'
      : 'InstaPay payment reference';
  }
  submitForReview(): void {
    const payment = this.payment();
    const reference = this.paymentReference().trim();
    this.reviewAttempted.set(true);
    if (!payment || !this.isManualPayment() || !reference || this.submittingReview()) return;

    this.submittingReview.set(true);
    this.reviewError.set('');
    this.paymentService
      .submitPaymentForReview({
        paymentId: payment.paymentId,
        paymentMethod: this.selectedPaymentMethod() as
          typeof PAYMENT_METHOD.EWallet | typeof PAYMENT_METHOD.InstaPay,
        paymentReference: reference,
        promoCodeId: this.promoPreview()?.id ?? null,
      })
      .pipe(finalize(() => this.submittingReview.set(false)))
      .subscribe({
        next: () => {
          this.closeCheckout();
          this.reviewSubmitted.emit(payment);
        },
        error: (error) => {
          this.reviewError.set(
            error?.error?.detail ??
              error?.error?.title ??
              'Your payment could not be submitted for review. Please try again.',
          );
        },
      });
  }
  onPromoCodeInput(event: Event): void {
    this.promoCode.set((event.target as HTMLInputElement).value);
  }
  applyPromoCode(): void {
    const code = this.promoCode().trim();
    if (!code || this.applyingPromo() || this.preparingPayment()) return;
    const payment = this.payment();
    if (!payment) {
      this.promoError.set('Payment details are still loading. Please try again.');
      return;
    }
    const planId = this.subscriptionPlanId;
    if (!planId) {
      this.promoError.set(
        'This payment is missing its plan information. Please refresh and try again.',
      );
      return;
    }
    this.applyingPromo.set(true);
    this.promoError.set('');
    this.promoCodeService
      .previewPromoCode({ promoCode: code, memberId: payment.memberId, planId })
      .subscribe({
        next: (promo) => {
          this.promoPreview.set(promo);
          this.promoCode.set(promo.code || code);
          this.applyingPromo.set(false);
          if (this.selectedPaymentMethod() === PAYMENT_METHOD.Visa) {
            this.prepareStripeIntent(promo.id);
          }
        },
        error: (error) => {
          this.applyingPromo.set(false);
          this.promoPreview.set(null);
          this.promoError.set(this.promoApiMessage(error));
        },
      });
  }
  removePromoCode(): void {
    this.promoCode.set('');
    this.promoPreview.set(null);
    this.promoError.set('');
    if (this.visible() && this.selectedPaymentMethod() === PAYMENT_METHOD.Visa) {
      this.prepareStripeIntent(null);
    }
  }
  promoDiscountLabel(promo: PromoCodeResponse): string {
    return this.isPercentagePromo(promo)
      ? `${promo.discountValue}% off`
      : `${promo.discountValue.toLocaleString()} EGP off`;
  }
  async payWithCard(): Promise<void> {
    if (
      this.selectedPaymentMethod() !== PAYMENT_METHOD.Visa ||
      !this.stripe ||
      !this.card ||
      !this.clientSecret ||
      this.paying()
    )
      return;
    this.paying.set(true);
    this.paymentError.set('');
    try {
      const result = await this.stripe.confirmCardPayment(this.clientSecret, {
        payment_method: { card: this.card },
      });
      if (result.error) {
        this.paymentError.set(result.error.message ?? 'Your card payment could not be completed.');
        return;
      }
      if (result.paymentIntent?.status === 'succeeded') {
        const payment = this.payment();
        if (payment) this.completed.emit(payment);
        this.visible.set(false);
        return;
      }
      const status = result.paymentIntent?.status;
      this.paymentError.set(
        status === 'processing'
          ? 'Your payment is still processing. We will update your membership when Stripe confirms it.'
          : 'Your payment was not completed. Please review your card details and try again.',
      );
    } catch {
      this.paymentError.set('Your card payment could not be completed. Please try again.');
    } finally {
      this.paying.set(false);
    }
  }
  closeCheckout(): void {
    this.visible.set(false);
    this.destroyCard();
    this.promoCode.set('');
    this.promoPreview.set(null);
    this.promoError.set('');
    this.paymentReference.set('');
    this.reviewError.set('');
    this.reviewAttempted.set(false);
    this.selectedPaymentMethod.set(PAYMENT_METHOD.Visa);
  }
  ngOnDestroy(): void {
    this.destroyCard();
  }
  private prepareStripeIntent(promoCodeId: number | null): void {
    const payment = this.payment();
    if (!payment || this.selectedPaymentMethod() !== PAYMENT_METHOD.Visa || this.preparingPayment())
      return;
    this.paymentError.set('');
    this.preparingPayment.set(true);
    this.preparingChange.emit(true);
    this.destroyCard();
    this.clientSecret = '';
    this.paymentService.createStripeIntent(payment.paymentId, promoCodeId).subscribe({
      next: (intent) => {
        this.preparingPayment.set(false);
        this.preparingChange.emit(false);
        if (this.selectedPaymentMethod() !== PAYMENT_METHOD.Visa) return;
        if (!intent.clientSecret) {
          this.paymentError.set('Secure payment could not be prepared. Please try again.');
          return;
        }
        this.clientSecret = intent.clientSecret;
        this.visible.set(true);
        window.setTimeout(() => void this.mountCard(), 0);
      },
      error: (error) => {
        this.preparingPayment.set(false);
        this.preparingChange.emit(false);
        if (this.selectedPaymentMethod() !== PAYMENT_METHOD.Visa) return;
        this.paymentError.set(
          error?.error?.detail ??
            error?.error?.title ??
            'Secure payment could not be prepared. Please try again.',
        );
      },
    });
  }
  private async mountCard(): Promise<void> {
    if (!this.clientSecret || !this.cardHost?.nativeElement) return;
    if (!appConfig.stripePublishableKey) {
      this.paymentError.set(
        'Stripe card payments need a publishable key configured for this environment.',
      );
      return;
    }
    this.destroyCard();
    this.stripe = await loadStripe(appConfig.stripePublishableKey);
    if (!this.stripe) {
      this.paymentError.set('Secure card payment is unavailable right now. Please try again.');
      return;
    }
    this.card = this.stripe.elements().create('card', {
      style: {
        base: {
          color: '#6366f1',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '16px',
          '::placeholder': { color: '#94a3b8' },
        },
      },
    });
    this.card.mount(this.cardHost.nativeElement);
  }
  private destroyCard(): void {
    this.card?.destroy();
    this.card = null;
    this.stripe = null;
  }
  private loadSubscriptionPlan(payment: MemberPayment): void {
    forkJoin({
      current: this.subscriptionService
        .getCurrent(payment.memberId)
        .pipe(catchError(() => of(null))),
      history: this.subscriptionService
        .getHistory(payment.memberId)
        .pipe(catchError(() => of([] as MemberSubscription[]))),
    }).subscribe(({ current, history }) => {
      const subscriptions = current ? [current, ...history] : history;
      const subscription = subscriptions.find(
        (item) => item.subscriptionId === payment.subscriptionId,
      );
      this.subscriptionPlanId = subscription?.planId ?? null;
    });
  }
  private isPercentagePromo(promo: PromoCodeResponse): boolean {
    return (
      promo.discountType === PromoDiscountType.Percentage ||
      String(promo.discountType).toLowerCase() === 'percentage'
    );
  }
  private promoApiMessage(error: unknown): string {
    const response = error as {
      error?:
        | { title?: string; detail?: string; message?: string; code?: string; errorCode?: string }
        | string;
      message?: string;
    };
    const payload = response?.error;
    if (typeof payload === 'string') return this.friendlyPromoError(payload);
    const raw =
      payload?.detail ??
      payload?.message ??
      payload?.code ??
      payload?.errorCode ??
      payload?.title ??
      response?.message;
    return raw ? this.friendlyPromoError(raw) : 'This promo code could not be applied.';
  }
  private friendlyPromoError(value: string): string {
    const normalized = value.replace(/[_-]/g, '').toLowerCase();
    if (normalized.includes('notapplicable') && normalized.includes('plan'))
      return 'This promo code is not applicable to the selected plan.';
    if (normalized.includes('newmember'))
      return 'This promo code is available only for new members.';
    if (normalized.includes('expired')) return 'This promo code has expired.';
    if (normalized.includes('usagelimit')) return 'This promo code has reached its usage limit.';
    return value;
  }
  open(): void {
    const payment = this.payment();

    if (!payment || this.preparingPayment()) return;

    this.paymentError.set('');
    this.reviewError.set('');
    this.reviewAttempted.set(false);
    this.paymentReference.set('');
    this.selectedPaymentMethod.set(PAYMENT_METHOD.Visa);
    this.promoCode.set('');
    this.promoPreview.set(null);
    this.promoError.set('');

    this.loadSubscriptionPlan(payment);
    this.prepareStripeIntent(null);
  }
}
