import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { catchError, of, switchMap, take } from 'rxjs';
import { MemberPayment } from '../../shared/models/member-area.models';
import { PaymentService } from '../../../shared/services/payment.service';
import { MemberService } from '../../../shared/services/member.service';
import { InvoiceDialog } from '../../../shared/components/invoice-dialog/invoice-dialog';
import { PaymentDetailsDialog } from '../../../shared/components/payment-details-dialog/payment-details-dialog';
import { MemberPaymentTable } from './components/payment-table/member-payment-table';
import { MemberPaymentCheckout } from './components/payment-checkout/payment-checkout';
import { MemberPaymentSuccess } from './components/payment-success/payment-success';

@Component({
  imports: [
    DecimalPipe,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    InvoiceDialog,
    PaymentDetailsDialog,
    MemberPaymentTable,
    MemberPaymentCheckout,
    MemberPaymentSuccess,
  ],
  providers: [ConfirmationService, MessageService],
  selector: 'app-member-payments',
  styleUrl: './payments.scss',
  templateUrl: './payments.html',
})
export class MemberPayments {
  private readonly memberService = inject(MemberService);
  private readonly paymentService = inject(PaymentService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly payments = signal<MemberPayment[]>([]);
  readonly loading = signal(true);
  readonly preparingPayment = signal(false);
  readonly detailsVisible = signal(false);
  readonly invoiceVisible = signal(false);
  readonly invoicePaymentId = signal<number | null>(null);
  readonly checkoutVisible = signal(false);
  readonly successVisible = signal(false);
  readonly successfulPaymentWasFree = signal(false);
  readonly selectedPayment = signal<MemberPayment | null>(null);
  readonly successfulPayment = signal<MemberPayment | null>(null);
  readonly pendingPayments = computed(() =>
    this.payments().filter((payment) => this.isPayable(payment)),
  );
  readonly paymentSummaryTitle = computed(() => {
    const pendingCount = this.pendingPayments().length;
    return pendingCount
      ? `${pendingCount} payment${pendingCount > 1 ? 's' : ''} need attention`
      : this.payments().length
        ? 'Up to date'
        : 'No payments yet';
  });
  readonly paymentSummaryNote = computed(() =>
    this.pendingPayments().length
      ? 'Your pending card payment is highlighted above.'
      : 'Every transaction is linked to your membership.',
  );

  constructor() {
    this.load();
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      if (params.get('pending') === '1') {
        this.messages.add({
          severity: 'info',
          summary: 'Payment required',
          detail: 'Your subscription is ready. Complete the pending payment below to activate it.',
        });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.memberService
      .getMe()
      .pipe(
        switchMap((member) =>
          this.paymentService
            .getHistory(member.memberId)
            .pipe(catchError(() => of([] as MemberPayment[]))),
        ),
        catchError(() => of(null)),
      )
      .subscribe((payments) => {
        if (payments) {
          this.payments.set(
            [...payments].sort((a, b) => {
              const pendingDifference = Number(this.isPayable(a)) - Number(this.isPayable(b));
              return (
                pendingDifference ||
                new Date(b.paidAtUtc ?? 0).getTime() - new Date(a.paidAtUtc ?? 0).getTime()
              );
            }),
          );
        }
        this.loading.set(false);
      });
  }

  isPayable(payment: MemberPayment): boolean {
    return payment.status.toLowerCase() === 'pending';
  }
  isCompleted(payment: MemberPayment): boolean {
    return payment.status.toLowerCase() === 'paid';
  }

  preparePayment(payment: MemberPayment): void {
    if (!this.isPayable(payment) || this.preparingPayment()) return;
    this.selectedPayment.set(payment);
    this.checkoutVisible.set(true);
  }

  view(payment: MemberPayment): void {
    this.selectedPayment.set(payment);
    this.detailsVisible.set(true);
    this.paymentService
      .getPayment(payment.paymentId)
      .pipe(catchError(() => of(payment)))
      .subscribe((detail) => this.selectedPayment.set(detail));
  }

  viewInvoice(payment: MemberPayment): void {
    if (!this.isCompleted(payment)) return;
    this.invoicePaymentId.set(payment.paymentId);
    this.invoiceVisible.set(true);
  }

  viewSelectedInvoice(): void {
    const payment = this.selectedPayment();
    if (payment) this.viewInvoice(payment);
  }

  onPaymentCompleted(payment: MemberPayment): void {
    this.showCompletion(payment, false);
  }

  onFreePaymentCompleted(payment: MemberPayment): void {
    this.showCompletion(payment, true);
  }

  private showCompletion(payment: MemberPayment, wasFree: boolean): void {
    this.successfulPayment.set(payment);
    this.successfulPaymentWasFree.set(wasFree);
    this.successVisible.set(true);
    this.messages.add({
      severity: 'success',
      summary: wasFree ? 'Membership activated for free' : 'Payment submitted',
      detail: wasFree
        ? 'Your promo code covered the full cost. No payment method was needed.'
        : 'Your membership will be updated automatically.',
    });
    this.load();
  }

  onReviewSubmitted(): void {
    this.messages.add({
      severity: 'success',
      summary: 'Payment submitted for review',
      detail: 'Your payment is waiting for admin verification.',
    });
    this.load();
  }

  viewMembership(): void {
    this.successVisible.set(false);
    this.router.navigate(['/member/membership']);
  }

  viewSuccessfulPayment(): void {
    this.successVisible.set(false);
    const payment = this.successfulPayment();
    if (payment) this.view(payment);
  }

  cancel(payment: MemberPayment): void {
    this.confirmation.confirm({
      header: 'Cancel pending payment?',
      message:
        'This will cancel the pending ' +
        payment.planName +
        ' payment of ' +
        payment.amount.toLocaleString() +
        ' EGP.',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Keep payment',
      acceptLabel: 'Cancel payment',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.paymentService.cancel(payment.paymentId).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Payment cancelled',
              detail: 'The pending payment was cancelled.',
            });
            this.load();
          },
          error: (error) =>
            this.messages.add({
              severity: 'error',
              summary: 'Could not cancel payment',
              detail: error?.error?.detail ?? error?.error?.title ?? 'Please try again.',
            }),
        }),
    });
  }
}
