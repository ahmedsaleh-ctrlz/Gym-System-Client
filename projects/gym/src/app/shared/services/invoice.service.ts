import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { appConfig } from 'config';
import { Observable } from 'rxjs';
import { Invoice } from '../models/invoice.models';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);
  private readonly url = `${appConfig.apiUrl}/invoices`;

  getInvoice(id: number): Observable<Invoice> {
    return this.http.get<Invoice>(`${this.url}/${id}`);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.url}/${id}/pdf`, { responseType: 'blob' });
  }
}
