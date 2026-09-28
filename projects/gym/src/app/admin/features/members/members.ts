import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, debounceTime, distinctUntilChanged, of } from 'rxjs';
import { Member } from './models/member.models';
import { Payment } from '../../../shared/models/payment.models';
import { Subscription } from '../../../shared/models/subscription.models';
import { AttendanceRecord } from '../../../shared/models/attendance.models';
import { MembersService } from './services/members-service';
import { AttendanceApiService } from '../../../shared/services/attendance-api.service';
import { PaymentService } from '../../../shared/services/payment.service';
import { SubscriptionService } from '../../../shared/services/subscription.service';
import { MemberService } from '../../../shared/services/member.service';
import { resolveImageUrl } from '../../../shared/image-url';

@Component({
  imports: [
    ReactiveFormsModule,
    DatePipe,
    DecimalPipe,
    AvatarModule,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [ConfirmationService, MessageService],
  selector: 'app-members',
  styleUrl: './members.scss',
  templateUrl: './members.html',
})
export class Members {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(MembersService);
  private readonly memberService = inject(MemberService);
  private readonly attendanceService = inject(AttendanceApiService);
  private readonly paymentService = inject(PaymentService);
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly messages = inject(MessageService);
  private readonly confirmation = inject(ConfirmationService);
  members = signal<Member[]>([]);
  activeCount = signal(0);
  totalMembers = signal(0);
  loading = signal(true);
  saving = signal(false);
  searchTerm = signal('');
  pageSize = 10;
  pageNumber = 1;
  memberDialogVisible = false;
  detailDialogVisible = false;
  editingId: number | null = null;
  selectedMember = signal<Member | null>(null);
  latestSubscription = signal<Subscription | null>(null);
  subscriptionHistory = signal<Subscription[]>([]);
  payments = signal<Payment[]>([]);
  attendances = signal<AttendanceRecord[]>([]);
  detailLoading = signal(false);
  searchControl = this.fb.control('');
  memberForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.maxLength(30)]],
    dateOfBirth: [''],
    joinDate: [this.today()],
    notes: [''],
    password: [''],
  });
  imageUrl(imageUrl: string | null): string | undefined {
    return resolveImageUrl(imageUrl) ?? undefined;
  }
  constructor() {
    this.loadMembers();
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe((value) => {
        this.searchTerm.set(value!);
        this.loadMembers(1);
      });
    this.service
      .getActiveMembers()
      .pipe(catchError(() => of([])))
      .subscribe((members) => this.activeCount.set(members.length));
  }

  loadMembers(page = this.pageNumber): void {
    this.loading.set(true);
    this.pageNumber = page;
    this.service.getMembers(page, this.pageSize, this.searchTerm()).subscribe({
      next: (response) => {
        this.members.set(response.items ?? []);
        this.totalMembers.set(response.totalCount ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Could not load members',
          detail: 'Check the API connection and try again.',
        });
      },
    });
  }

  openCreate(): void {
    this.editingId = null;
    this.memberForm.reset({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: '',
      joinDate: this.today(),
      notes: '',
      password: '',
    });
    this.memberForm.controls.email.enable();
    this.memberForm.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
    this.memberDialogVisible = true;
  }
  openEdit(member: Member): void {
    this.editingId = member.memberId;
    this.memberForm.patchValue({
      ...member,
      dateOfBirth: this.dateOnly(member.dateOfBirth),
      joinDate: this.dateOnly(member.joinDate),
      notes: member.notes ?? '',
      password: '',
    });
    this.memberForm.controls.email.disable();
    this.memberForm.controls.password.clearValidators();
    this.memberDialogVisible = true;
  }
  saveMember(): void {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.memberForm.getRawValue();
    const request =
      this.editingId === null
        ? this.service.createMember(value)
        : this.service.updateMember(this.editingId, value);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.memberDialogVisible = false;
        this.messages.add({
          severity: 'success',
          summary: this.editingId === null ? 'Member added' : 'Member updated',
          detail: 'The directory is up to date.',
        });
        this.loadMembers();
      },
      error: (error) => {
        this.saving.set(false);
        this.messages.add({
          severity: 'error',
          summary: 'Save failed',
          detail: error?.error?.title ?? 'Please review the details and try again.',
        });
      },
    });
  }
  viewDetails(member: Member): void {
    this.selectedMember.set(member);
    this.latestSubscription.set(null);
    this.subscriptionHistory.set([]);
    this.payments.set([]);
    this.attendances.set([]);
    this.detailDialogVisible = true;
    this.detailLoading.set(true);
    this.memberService.getMember(member.memberId).subscribe((fresh) => this.selectedMember.set(fresh));
    this.subscriptionService
      .getMemberSubscription(member.memberId)
      .pipe(catchError(() => of(null)))
      .subscribe((item) => this.latestSubscription.set(item));
    this.subscriptionService
      .getMemberHistory(member.memberId)
      .pipe(catchError(() => of([])))
      .subscribe((items) => this.subscriptionHistory.set(items));
    this.paymentService
      .getMemberHistory(member.memberId)
      .pipe(catchError(() => of([])))
      .subscribe((items) => this.payments.set(items));
    this.attendanceService
      .getMemberHistory(member.memberId)
      .pipe(catchError(() => of({ items: [], totalCount: 0 })))
      .subscribe((response) => {
        this.attendances.set(response.items ?? []);
        this.detailLoading.set(false);
      });
  }
  remove(member: Member): void {
    this.confirmation.confirm({
      message: `Remove ${this.fullName(member)} from the gym? This cannot be undone.`,
      header: 'Remove member',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remove member',
      rejectLabel: 'Keep member',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        this.service.deleteMember(member.memberId).subscribe({
          next: () => {
            this.messages.add({
              severity: 'success',
              summary: 'Member removed',
              detail: `${this.fullName(member)} was removed.`,
            });
            this.loadMembers();
          },
          error: () =>
            this.messages.add({
              severity: 'error',
              summary: 'Delete failed',
              detail: 'The member could not be removed.',
            }),
        }),
    });
  }
  checkIn(member: Member): void {
    this.attendanceService.checkIn(member.memberId).subscribe({
      next: () => {
        this.messages.add({
          severity: 'success',
          summary: 'Checked in',
          detail: `${this.fullName(member)} is in the gym.`,
        });
        this.loadMembers();
      },
      error: (error) =>
        this.messages.add({
          severity: 'error',
          summary: 'Check-in failed',
          detail: error?.error?.title ?? 'Please try again.',
        }),
    });
  }
  fullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`.trim();
  }
  initials(member: Member): string {
    return `${member.firstName[0] ?? ''}${member.lastName[0] ?? ''}`.toUpperCase();
  }
  dateOnly(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }
  today(): string {
    return new Date().toISOString().slice(0, 10);
  }
  statusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    return status === 'Active' || status === 'Paid'
      ? 'success'
      : status === 'Pending' || status === 'Scheduled'
        ? 'warn'
        : status === 'Frozen'
          ? 'info'
          : 'danger';
  }
  isInvalid(control: string): boolean {
    const item = this.memberForm.get(control);
    return !!item?.invalid && (item.dirty || item.touched);
  }
}
