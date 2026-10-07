import { DecimalPipe } from '@angular/common';
import { Component, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MemberPayment } from '../../../../shared/models/member-area.models';
@Component({
  imports: [DecimalPipe, ButtonModule, DialogModule],
  selector: 'app-member-payment-success',
  styleUrl: './payment-success.scss',
  templateUrl: './payment-success.html',
})
export class MemberPaymentSuccess {
  readonly payment = input<MemberPayment | null>(null);
  readonly free = input(false);
  readonly visible = model(false);
  readonly viewPayment = output<void>();
  readonly viewMembership = output<void>();
}
