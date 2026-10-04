import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { catchError, debounceTime, distinctUntilChanged, of, Subject } from 'rxjs';
import {
  PAYMENT_METHOD_OPTIONS,
  Payment,
  PaymentFilters,
} from '../../../shared/models/payment.models';
import { PaymentService } from '../../../shared/services/payment.service';
import { InvoiceDialog } from '../../../shared/components/invoice-dialog/invoice-dialog';
import { PaymentDetailsDialog } from '../../../shared/components/payment-details-dialog/payment-details-dialog';
import { PayPayment } from './components/pay-payment/pay-payment';
import { AdminPaymentTable } from './components/payment-table/payment-table';

@Component({
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    ToastModule,
    InvoiceDialog,
    PaymentDetailsDialog,
    PayPayment,
    AdminPaymentTable,
  ],
  providers: [ConfirmationService, MessageService],
  selector: 'app-payments',
  styleUrl: './payments.scss',
  templateUrl: './payments.html',
})
export class Payments {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PaymentService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();

  payments = signal<Payment[]>([]);
  total = signal(0);
  loading = signal(true);
  selectedPayment = signal<Payment | null>(null);
  searchTerm = signal('');
  statusFilter = signal('');
  paymentMethodFilter = signal<number | null>(null);
  sortDirection = signal<'asc' | 'desc'>('desc');
  pageNumber = 1;
  pageSize = 10;
  filtersVisible = signal(false);
  detailsVisible = false;
  invoiceVisible = signal(false);
  invoicePaymentId = signal<number | null>(null);
  payVisible = false;
  refundVisible = false;
  actionLoading = signal<number | null>(null);
  paidTotal = signal(0);
  pendingTotal = signal(0);
  refundForm = this.fb.nonNullable.group({ paymentMethod: [0, Validators.required] });

  paymentMethods = PAYMENT_METHOD_OPTIONS;

  constructor() {
    this.searchChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value);
        this.loadPayments(1);
      });
    this.loadPayments();
  }

  loadPayments(page = this.pageNumber): void {
    this.loading.set(true);
    this.pageNumber = page;
    this.service.getPayments(this.currentFilters()).subscribe({
      next: (response) => {
        const items = response.items ?? [];
        this.payments.set(items);
        this.total.set(response.totalCount ?? 0);
        this.paidTotal.set(
          items
            .filter((item) => item.status === 'Paid')
            .reduce((sum, item) => sum + item.amount, 0),
        );
        this.pendingTotal.set(
          items
            .filter((item) => item.status === 'Pending')
            .reduce((sum, item) => sum + item.amount, 0),
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifyError('Could not load payments', 'Check the API connection and try again.');
      },
    });
  }

  applySearch(value: string): void {
    this.searchChanges.next(value);
  }
  applyFilters(): void {
    this.loadPayments(1);
  }
  clearFilters(): void {
    this.searchChanges.next('');
    this.searchTerm.set('');
    this.statusFilter.set('');
    this.paymentMethodFilter.set(null);
    this.loadPayments(1);
  }
  toggleSort(): void {
    this.sortDirection.update((direction) => (direction === 'desc' ? 'asc' : 'desc'));
    this.loadPayments(1);
  }
  viewDetails(payment: Payment): void {
    this.selectedPayment.set(payment);
    this.detailsVisible = true;
    this.service
      .getPayment(payment.paymentId)
      .pipe(catchError(() => of(payment)))
      .subscribe((item) => this.selectedPayment.set(item));
  }
  isCompleted(payment: Payment): boolean {
    return payment.status.toLowerCase() === 'paid';
  }
  viewInvoice(payment: Payment): void {
    if (!this.isCompleted(payment)) return;
    this.invoicePaymentId.set(payment.paymentId);
    this.invoiceVisible.set(true);
  }
  viewSelectedInvoice(): void {
    const payment = this.selectedPayment();
    if (payment) this.viewInvoice(payment);
  }
  recordSelectedPayment(): void {
    const payment = this.selectedPayment();
    if (payment) this.openPay(payment);
  }
  refundSelectedPayment(): void {
    const payment = this.selectedPayment();
    if (payment) this.openRefund(payment);
  }
  cancelSelectedPayment(): void {
    const payment = this.selectedPayment();
    if (payment) this.cancelPayment(payment);
  }
  approveSelectedPayment(): void {
    const payment = this.selectedPayment();
    if (payment) this.approvePayment(payment);
  }
  rejectSelectedPayment(): void {
    const payment = this.selectedPayment();
    if (payment) this.rejectPayment(payment);
  }
  private isUnderReview(payment: Payment): boolean {
    return payment.status === 'UnderReview';
  }
  approvePayment(payment: Payment): void {
    if (!this.isUnderReview(payment) || this.actionLoading() !== null) return;
    this.confirmation.confirm({
      header: 'Approve manual payment',
      message: `Approve payment #${payment.paymentId} for ${payment.memberName}?`,
      icon: 'pi pi-check-circle',
      acceptLabel: 'Approve payment',
      rejectLabel: 'Review again',
      accept: () => {
        this.actionLoading.set(payment.paymentId);
        this.service.approvePayment(payment.paymentId).subscribe({
          next: () => {
            this.actionLoading.set(null);
            this.detailsVisible = false;
            this.notifySuccess(
              'Payment approved successfully',
              `Payment #${payment.paymentId} is now paid.`,
            );
            this.loadPayments();
          },
          error: (error) => {
            this.actionLoading.set(null);
            this.notifyError('Approval failed', this.apiMessage(error));
          },
        });
      },
    });
  }
  rejectPayment(payment: Payment): void {
    if (!this.isUnderReview(payment) || this.actionLoading() !== null) return;
    this.confirmation.confirm({
      header: 'Reject manual payment',
      message: `Reject payment #${payment.paymentId} for ${payment.memberName}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Reject payment',
      rejectLabel: 'Keep under review',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.actionLoading.set(payment.paymentId);
        this.service.rejectPayment(payment.paymentId).subscribe({
          next: () => {
            this.actionLoading.set(null);
            this.detailsVisible = false;
            this.notifySuccess('Payment rejected', `Payment #${payment.paymentId} was rejected.`);
            this.loadPayments();
          },
          error: (error) => {
            this.actionLoading.set(null);
            this.notifyError('Rejection failed', this.apiMessage(error));
          },
        });
      },
    });
  }
  openPay(payment: Payment): void {
    this.selectedPayment.set(payment);
    this.payVisible = true;
  }
  onPaymentCompleted(): void {
    this.payVisible = false;
    this.loadPayments();
  }
  openRefund(payment: Payment): void {
    this.selectedPayment.set(payment);
    this.refundForm.reset({ paymentMethod: this.methodValue(payment.paymentMethod) });
    this.refundVisible = true;
  }

  refundPayment(): void {
    const payment = this.selectedPayment();
    if (!payment || this.refundForm.invalid) return;
    this.confirmation.confirm({
      header: 'Confirm refund',
      message: `Refund payment #${payment.paymentId} for ${payment.memberName}? The payment will be marked as refunded.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Refund payment',
      rejectLabel: 'Keep payment',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.actionLoading.set(payment.paymentId);
        this.service
          .refund({
            paymentId: payment.paymentId,
          })
          .subscribe({
            next: () => {
              this.actionLoading.set(null);
              this.refundVisible = false;
              this.notifySuccess(
                'Payment refunded',
                `Payment #${payment.paymentId} has been refunded.`,
              );
              this.loadPayments();
            },
            error: (error) => {
              this.actionLoading.set(null);
              this.notifyError('Refund failed', this.apiMessage(error));
            },
          });
      },
    });
  }
  cancelPayment(payment: Payment): void {
    this.confirmation.confirm({
      header: 'Cancel payment',
      message: `Cancel payment #${payment.paymentId} for ${payment.memberName}? This action needs to be confirmed.`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Cancel payment',
      rejectLabel: 'Keep payment',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.actionLoading.set(payment.paymentId);
        this.service.cancel(payment.paymentId).subscribe({
          next: () => {
            this.actionLoading.set(null);
            this.notifySuccess(
              'Payment cancelled',
              `Payment #${payment.paymentId} has been cancelled.`,
            );
            this.loadPayments();
          },
          error: (error) => {
            this.actionLoading.set(null);
            this.notifyError('Could not cancel payment', this.apiMessage(error));
          },
        });
      },
    });
  }
  methodValue(method: string | number): number {
    if (typeof method === 'number') {
      return method;
    }

    return this.paymentMethods.find((item) => item.label === method)?.value ?? 0;
  }
  pendingCount(): number {
    return this.payments().filter((payment) => payment.status === 'Pending').length;
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
  private currentFilters(): PaymentFilters {
    return {
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
      searchTerm: this.searchTerm(),
      status: this.statusFilter(),
      paymentMethod: this.paymentMethodFilter(),
      sortBy: 'paidAtUtc',
      sortDirection: this.sortDirection(),
    };
  }
}
