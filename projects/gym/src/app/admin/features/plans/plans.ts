import { DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { CreatePlanRequest, Plan } from '../../../shared/models/plan.models';
import { PlanService } from '../../../shared/services/plan.service';

@Component({
  imports: [ReactiveFormsModule, DecimalPipe, ButtonModule, ConfirmDialogModule, DialogModule, InputTextModule, MessageModule, TableModule, TagModule, ToastModule, TooltipModule],
  providers: [ConfirmationService, MessageService],
  selector: 'app-plans',
  styleUrl: './plans.scss',
  templateUrl: './plans.html',
})
export class Plans {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PlanService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();

  plans = signal<Plan[]>([]);
  total = signal(0);
  loading = signal(true);
  saving = signal(false);
  searchTerm = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  pageNumber = 1;
  pageSize = 10;
  planDialogVisible = false;
  detailsVisible = false;
  editingId: number | null = null;
  selectedPlan = signal<Plan | null>(null);

  planForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    cost: [0, [Validators.required, Validators.min(0.01)]],
    durationInDays: [30, [Validators.required, Validators.min(1), Validators.pattern(/^[0-9]+$/)]],
    allowedFreezeCount: [0, [Validators.required, Validators.min(0), Validators.pattern(/^[0-9]+$/)]],
    maxTotalFreezeDays: [0, [Validators.required, Validators.min(0), Validators.pattern(/^[0-9]+$/)]],
  });

  constructor() {
    this.searchChanges.pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((value) => { this.searchTerm.set(value); this.loadPlans(1); });
    this.loadPlans();
  }

  loadPlans(page = this.pageNumber): void {
    this.loading.set(true);
    this.pageNumber = page;
    this.service.getPlans(page, this.pageSize, this.searchTerm(), 'title', this.sortDirection()).subscribe({
      next: (response) => { this.plans.set(response.items ?? []); this.total.set(response.totalCount ?? 0); this.loading.set(false); },
      error: (error) => { this.loading.set(false); this.notifyError('Could not load plans', this.apiMessage(error)); },
    });
  }

  applySearch(value: string): void { this.searchChanges.next(value); }
  toggleSort(): void { this.sortDirection.update((direction) => direction === 'asc' ? 'desc' : 'asc'); this.loadPlans(1); }
  clearSearch(): void { this.searchChanges.next(''); this.searchTerm.set(''); this.loadPlans(1); }

  openCreate(): void { this.editingId = null; this.planForm.reset({ title: '', description: '', cost: 0, durationInDays: 30, allowedFreezeCount: 0, maxTotalFreezeDays: 0 }); this.planDialogVisible = true; }
  openEdit(plan: Plan): void {
    this.editingId = plan.planId;
    this.service.getPlanById(plan.planId).subscribe({ next: (freshPlan) => { this.selectedPlan.set(freshPlan); this.planForm.reset(this.formValue(freshPlan)); this.planDialogVisible = true; }, error: (error) => this.notifyError('Could not open plan', this.apiMessage(error)) });
  }
  savePlan(): void {
    if (this.planForm.invalid) { this.planForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const request = this.planForm.getRawValue() as CreatePlanRequest;
    const operation = this.editingId === null ? this.service.createPlan(request) : this.service.updatePlan(this.editingId, request);
    operation.subscribe({ next: () => { this.saving.set(false); this.planDialogVisible = false; this.notifySuccess(this.editingId === null ? 'Plan created' : 'Plan updated', 'The plan catalog is up to date.'); this.loadPlans(); }, error: (error) => { this.saving.set(false); this.notifyError('Could not save plan', this.apiMessage(error)); } });
  }
  viewDetails(plan: Plan): void { this.service.getPlanById(plan.planId).subscribe({ next: (freshPlan) => { this.selectedPlan.set(freshPlan); this.detailsVisible = true; }, error: (error) => this.notifyError('Could not load plan details', this.apiMessage(error)) }); }
  deactivate(plan: Plan): void { this.confirmation.confirm({ header: 'Deactivate plan', message: `Deactivate ${plan.title}? Existing subscriptions will not be deleted, but this plan will no longer be active for new selections.`, icon: 'pi pi-exclamation-triangle', acceptLabel: 'Deactivate plan', rejectLabel: 'Keep plan', acceptButtonStyleClass: 'p-button-danger', accept: () => this.service.deactivatePlan(plan.planId).subscribe({ next: () => { this.notifySuccess('Plan deactivated', `${plan.title} is no longer available for new subscriptions.`); this.loadPlans(); }, error: (error) => this.notifyError('Could not deactivate plan', this.apiMessage(error)) }) }); }
  statusSeverity(active: boolean): 'success' | 'secondary' { return active ? 'success' : 'secondary'; }
  formValue(plan: Plan) { return { title: plan.title, description: plan.description, cost: plan.cost, durationInDays: plan.durationInDays, allowedFreezeCount: plan.allowedFreezeCount, maxTotalFreezeDays: plan.maxTotalFreezeDays }; }
  isInvalid(name: string): boolean { const control = this.planForm.get(name); return !!control?.invalid && (control.dirty || control.touched); }
  error(name: string): string { const control = this.planForm.get(name); if (control?.hasError('required')) return 'This field is required.'; if (control?.hasError('min')) return 'Enter a valid positive value.'; if (control?.hasError('pattern')) return 'Use a whole number.'; return 'Please check this field.'; }
  apiMessage(error: { error?: { title?: string } }): string { return error?.error?.title ?? 'Please try again and review the server response.'; }
  notifySuccess(summary: string, detail: string): void { this.messages.add({ severity: 'success', summary, detail }); }
  notifyError(summary: string, detail: string): void { this.messages.add({ severity: 'error', summary, detail }); }
}
