import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { PAYMENT_METHOD_OPTIONS, Payment } from '../../models/payment.models';
@Component({
  imports: [DatePipe, DecimalPipe, ButtonModule, DialogModule, TagModule],
  selector: 'app-payment-details-dialog',
  styleUrl: './payment-details-dialog.scss',
  templateUrl: './payment-details-dialog.html',
})
export class PaymentDetailsDialog {
  readonly payment = input<Payment | null>(null);
  readonly visible = model(false);
  readonly memberMode = input(false);
  readonly viewInvoice = output<void>();
  readonly record = output<void>();
  readonly refund = output<void>();
  readonly cancel = output<void>();
  readonly approve = output<void>();
  readonly reject = output<void>();
  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (this.memberMode()) {
      switch (status.toLowerCase()) {
        case 'active':
        case 'paid':
          return 'success';
        case 'scheduled':
          return 'info';
        case 'pending':
        case 'frozen':
        case 'underreview':
          return 'warn';
        case 'expired':
        case 'failed':
        case 'cancelled':
        case 'rejected':
          return 'danger';
        default:
          return 'secondary';
      }
    }
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Pending':
      case 'UnderReview':
        return 'warn';
      case 'Refunded':
        return 'info';
      case 'Rejected':
      case 'Cancelled':
      case 'Failed':
        return 'danger';
      default:
        return 'secondary';
    }
  }
  isPending(payment: Payment): boolean {
    return this.memberMode()
      ? payment.status.toLowerCase() === 'pending'
      : payment.status === 'Pending';
  }
  isCompleted(payment: Payment): boolean {
    return this.memberMode() ? payment.status.toLowerCase() === 'paid' : payment.status === 'Paid';
  }
  isUnderReview(payment: Payment): boolean {
    return payment.status.toLowerCase() === 'underreview';
  }
  paymentMethodLabel(method: string | number, payment: Payment): string {
    if (this.memberMode() && this.isPending(payment)) return 'Card via Stripe';
    if (typeof method === 'number') {
      return (
        PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ??
        `Method ${method}`
      );
    }
    return method || 'Not recorded';
  }
  hasPaymentReference(payment: Payment): boolean {
    if (typeof payment.paymentMethod === 'number')
      return payment.paymentMethod === 2 || payment.paymentMethod === 3;
    const method = payment.paymentMethod.trim().toLowerCase().replace(/[-_ ]/g, '');
    return method === 'ewallet' || method === 'instapay';
  }
  statusLabel(status: string): string {
    return status === 'UnderReview' ? 'Under Review' : status;
  }
}
