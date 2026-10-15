import { DatePipe } from '@angular/common';
import { Component, inject, input, output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { AdminAiInsightsResponse } from '../../models/adminDashboardResponse';
import { DashboardService } from '../../services/dashboard-service';

@Component({
  selector: 'app-ai-insights-dialog',
  imports: [DialogModule, DatePipe],
  templateUrl: './ai-insights-dialog.html',
  styleUrl: './ai-insights-dialog.scss',
})
export class AiInsightsDialog {
  private readonly service = inject(DashboardService);
  readonly visible = input(false);
  readonly closed = output<void>();
  readonly insights = signal<AdminAiInsightsResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);
  private requested = false;
  private inFlight = false;

  load(): void {
    if (this.requested || this.inFlight) return;
    this.requested = true;
    this.inFlight = true;
    this.loading.set(true);
    this.error.set(false);
    this.service.getAiInsights().subscribe({
      next: (response) => { this.insights.set(response); this.loading.set(false); this.inFlight = false; },
      error: () => { this.loading.set(false); this.error.set(true); this.inFlight = false; this.requested = false; },
    });
  }

  refresh(): void {
    if (this.inFlight) return;
    this.requested = false;
    this.insights.set(null);
    this.load();
  }

  retry(): void { this.refresh(); }
  close(): void { this.closed.emit(); }
  severityIcon(value: string): string { return ({ positive: 'pi pi-arrow-up-right', neutral: 'pi pi-minus', warning: 'pi pi-exclamation-triangle', critical: 'pi pi-exclamation-circle' } as Record<string, string>)[value] ?? 'pi pi-sparkles'; }
}
