import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { MemberPayment } from '../../../../shared/models/member-area.models';
import { statusSeverity } from '../../../../shared/member.helpers';
@Component({
  imports: [DatePipe, DecimalPipe, ButtonModule, TableModule, TagModule],
  selector: 'app-member-payment-table',
  styleUrl: './member-payment-table.scss',
  templateUrl: './member-payment-table.html',
})
export class MemberPaymentTable {
  readonly payments = input.required<MemberPayment[]>();
  readonly loading = input(false);
  readonly preparingPaymentId = input<number | null>(null);
  readonly view = output<MemberPayment>();
  readonly pay = output<MemberPayment>();
  readonly cancel = output<MemberPayment>();
  isPayable(p: MemberPayment): boolean {
    return p.status.toLowerCase() === 'pending';
  }
  canCancel(p: MemberPayment): boolean {
    return this.isPayable(p);
  }
  methodLabel(method: string | number, p: MemberPayment): string {
    return this.isPayable(p)
      ? 'Card via Stripe'
      : typeof method === 'number'
        ? method === 0
          ? 'Card'
          : 'Method ' + method
        : method || '—';
  }
  statusSeverity = statusSeverity;
}
