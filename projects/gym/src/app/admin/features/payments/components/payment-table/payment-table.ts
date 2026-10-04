import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Payment, PaymentMethodOption } from '../../../../../shared/models/payment.models';
@Component({
  imports: [
    DatePipe,
    DecimalPipe,
    ButtonModule,
    InputTextModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  selector: 'app-admin-payment-table',
  styleUrl: './payment-table.scss',
  templateUrl: './payment-table.html',
})
export class AdminPaymentTable {
  readonly payments = input.required<Payment[]>();
  readonly total = input(0);
  readonly loading = input(false);
  readonly pageNumber = input(1);
  readonly pageSize = input(10);
  readonly searchTerm = input('');
  readonly statusFilter = input('');
  readonly paymentMethodFilter = input<number | null>(null);
  readonly sortDirection = input<'asc' | 'desc'>('desc');
  readonly filtersVisible = input(false);
  readonly paymentMethods = input.required<ReadonlyArray<PaymentMethodOption>>();
  readonly search = output<string>();
  readonly sort = output<void>();
  readonly toggleFilters = output<void>();
  readonly refresh = output<void>();
  readonly filterStatus = output<string>();
  readonly filterMethod = output<number | null>();
  readonly clearFilters = output<void>();
  readonly page = output<number>();
  readonly view = output<Payment>();
  readonly record = output<Payment>();
  readonly refund = output<Payment>();
  readonly cancel = output<Payment>();
  onSearch(event: Event): void {
    this.search.emit((event.target as HTMLInputElement).value);
  }
  onStatusFilter(event: Event): void {
    this.filterStatus.emit((event.target as HTMLSelectElement).value);
  }
  onMethodFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterMethod.emit(value === '' ? null : Number(value));
  }
  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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
  paymentMethodLabel(method: string | number): string {
    if (typeof method === 'number')
      return (
        this.paymentMethods().find((item) => item.value === method)?.label ?? `Method ${method}`
      );
    return method || 'Not recorded';
  }
  statusLabel(status: string): string {
    return status === 'UnderReview' ? 'Under Review' : status;
  }
}
