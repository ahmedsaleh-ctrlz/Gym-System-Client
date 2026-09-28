import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, effect, inject, input, model, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { Invoice } from '../../models/invoice.models';
import { InvoiceService } from '../../services/invoice.service';

@Component({
  imports: [DatePipe, DecimalPipe, ButtonModule, DialogModule],
  selector: 'app-invoice-dialog',
  styleUrl: './invoice-dialog.scss',
  templateUrl: './invoice-dialog.html',
})
export class InvoiceDialog {
  private readonly service = inject(InvoiceService);

  readonly paymentId = input.required<number>();
  readonly visible = model(false);
  readonly invoice = signal<Invoice | null>(null);
  readonly loading = signal(false);
  readonly downloading = signal(false);
  readonly error = signal('');

  private readonly loadEffect = effect(() => {
    const paymentId = this.paymentId();
    if (this.visible() && paymentId > 0) this.loadInvoice(paymentId);
  });

  loadInvoice(paymentId = this.paymentId()): void {
    this.loading.set(true);
    this.invoice.set(null);
    this.error.set('');
    this.service.getInvoice(paymentId).subscribe({
      next: (invoice) => {
        this.loading.set(false);
        if (invoice) {
          this.invoice.set(invoice);
        } else {
          this.error.set('This payment does not have an invoice available yet.');
        }
      },
      error: (response) => {
        this.loading.set(false);
        this.error.set(
          response?.status === 404
            ? 'This payment does not have an invoice available yet.'
            : 'The invoice could not be loaded. Please try again.',
        );
      },
    });
  }

  downloadInvoice(): void {
    const invoice = this.invoice();
    if (!invoice || this.downloading()) return;

    this.downloading.set(true);
    this.service.downloadPdf(invoice.paymentId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice-${this.safeFilePart(invoice.invoiceNumber)}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: () => this.downloading.set(false),
    });
  }

  paymentMethodLabel(method: string | number): string {
    if (typeof method === 'number') {
      return ['Cash', 'Visa', 'E-Wallet', 'Insta Pay', 'Fawry'][method] ?? `Method ${method}`;
    }
    return method || 'Not recorded';
  }

  private safeFilePart(value: string): string {
    return (
      (value || String(this.paymentId()))
        .trim()
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/^-+|-+$/g, '') || String(this.paymentId())
    );
  }
}
