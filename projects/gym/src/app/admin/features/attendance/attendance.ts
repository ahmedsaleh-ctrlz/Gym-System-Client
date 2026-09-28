import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  of,
  Subject,
} from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AttendanceApiService } from '../../../shared/services/attendance-api.service';
import { AttendanceRecord } from '../../../shared/models/attendance.models';
import { MembersService } from '../members/services/members-service';
import { MemberService } from '../../../shared/services/member.service';
import { Member } from '../members/models/member.models';
import { Avatar } from 'primeng/avatar';
import { resolveImageUrl } from '../../../shared/image-url';

@Component({
  imports: [
    DatePipe,
    DecimalPipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MessageModule,
    TableModule,
    ToastModule,
    Avatar,
  ],
  providers: [MessageService],
  selector: 'app-attendance',
  styleUrl: './attendance.scss',
  templateUrl: './attendance.html',
})
export class AttendancePage {
  private readonly attendanceService = inject(AttendanceApiService);
  private readonly membersService = inject(MembersService);
  private readonly memberService = inject(MemberService);
  private readonly messages = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchChanges = new Subject<string>();
  private readonly memberSearchChanges = new Subject<string>();

  records = signal<AttendanceRecord[]>([]);
  memberImages = signal<Record<number, string | null>>({});
  total = signal(0);
  loading = signal(true);
  searchTerm = signal('');
  dateFrom = signal('');
  dateTo = signal('');
  sortDirection = signal<'asc' | 'desc'>('desc');
  pageNumber = 1;
  pageSize = 10;

  checkInVisible = false;
  imagePreviewVisible = false;
  checkInLoading = signal(false);
  memberSearchTerm = signal('');
  memberSearchResults = signal<Member[]>([]);
  memberSearchLoading = signal(false);
  memberPickerOpen = signal(false);
  selectedMember = signal<Member | null>(null);
  previewMember = signal<Member | null>(null);

  constructor() {
    this.searchChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchTerm.set(value);
        this.loadAttendance(1);
      });
    this.memberSearchChanges
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.loadMemberMatches(value));
    this.loadAttendance();
  }

  loadAttendance(page = this.pageNumber): void {
    this.loading.set(true);
    this.pageNumber = page;
    this.attendanceService
      .getAttendances(
        page,
        this.pageSize,
        this.searchTerm(),
        this.dateFrom(),
        this.dateTo(),
        'checkInAtUtc',
        this.sortDirection(),
      )
      .subscribe({
        next: (response) => {
          const items = response.items ?? [];
          this.records.set(items);
          this.prefetchMemberImages(items);
          this.total.set(response.totalCount ?? 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notifyError('Could not load attendance', 'Check the API connection and try again.');
        },
      });
  }

  applySearch(value: string): void {
    this.searchChanges.next(value.trimStart());
  }

  applyDateFilters(): void {
    this.loadAttendance(1);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.searchChanges.next('');
    this.loadAttendance(1);
  }

  toggleSort(): void {
    this.sortDirection.update((direction) => (direction === 'desc' ? 'asc' : 'desc'));
    this.loadAttendance(1);
  }

  openCheckIn(): void {
    this.checkInVisible = true;
    this.clearMemberSearch();
  }

  searchMembers(value: string): void {
    const searchTerm = value.trimStart();
    this.memberSearchTerm.set(searchTerm);
    this.selectedMember.set(null);
    this.memberSearchLoading.set(searchTerm.trim().length > 0);
    this.memberPickerOpen.set(true);
    this.memberSearchChanges.next(searchTerm);
  }

  selectMember(member: Member): void {
    this.selectedMember.set(member);
    this.memberSearchTerm.set(this.fullName(member));
    this.memberPickerOpen.set(false);
  }

  clearMemberSearch(): void {
    this.memberSearchTerm.set('');
    this.memberSearchResults.set([]);
    this.memberSearchLoading.set(false);
    this.memberPickerOpen.set(false);
    this.selectedMember.set(null);
  }

  checkInSelectedMember(): void {
    const member = this.selectedMember();
    if (!member || this.checkInLoading()) return;

    this.checkInLoading.set(true);
    this.attendanceService
      .checkIn(member.memberId)
      .pipe(finalize(() => this.checkInLoading.set(false)))
      .subscribe({
        next: (attendance) => {
          this.checkInVisible = false;
          const checkInTime = attendance?.checkInAtUtc
            ? new Date(attendance.checkInAtUtc).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'just now';
          this.notifySuccess(
            'Member checked in',
            `${this.fullName(member)} · ${checkInTime}`,
          );
          this.loadAttendance(1);
        },
        error: (error) => {
          this.notifyError('Check-in failed', this.apiErrorMessage(error));
        },
      });
  }

  checkInFromRow(record: AttendanceRecord): void {
    this.checkInVisible = true;
    this.clearMemberSearch();
    this.memberSearchTerm.set(record.memberName);
    this.memberSearchLoading.set(true);
    this.memberService
      .getMember(record.memberId)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.memberSearchLoading.set(false)),
      )
      .subscribe((member) => {
        if (!member) {
          this.notifyError(
            'Member unavailable',
            'Could not load the member profile for verification.',
          );
          this.checkInVisible = false;
          return;
        }
        this.selectedMember.set(member);
      });
  }

  openImagePreview(member: Member): void {
    if (!this.memberImageUrl(member)) return;
    this.previewMember.set(member);
    this.imagePreviewVisible = true;
  }

  memberImageUrl(member: Member): string | undefined {
    return resolveImageUrl(member.imageUrl) ?? undefined;
  }

  recordImageUrl(record: AttendanceRecord): string | null {
    return resolveImageUrl(this.memberImages()[record.memberId]);
  }

  private prefetchMemberImages(records: AttendanceRecord[]): void {
    const missingIds = [...new Set(records.map((record) => record.memberId))].filter(
      (memberId) => !(memberId in this.memberImages()),
    );
    if (!missingIds.length) return;

    forkJoin(
      missingIds.map((memberId) =>
        this.memberService.getMember(memberId).pipe(catchError(() => of(null))),
      ),
    ).subscribe((members) => {
      const images = { ...this.memberImages() };
      missingIds.forEach((memberId, index) => {
        images[memberId] = members[index]?.imageUrl ?? null;
      });
      this.memberImages.set(images);
    });
  }

  private loadMemberMatches(value: string): void {
    const searchTerm = value.trim();
    if (!searchTerm) {
      this.memberSearchResults.set([]);
      this.memberSearchLoading.set(false);
      this.memberPickerOpen.set(false);
      return;
    }

    this.memberSearchLoading.set(true);
    this.membersService
      .getMembers(1, 20, searchTerm)
      .pipe(
        catchError(() => of({ pageNumber: 1, pageSize: 20, totalCount: 0, items: [] })),
        finalize(() => this.memberSearchLoading.set(false)),
      )
      .subscribe((response) => {
        if (this.memberSearchTerm().trim() !== searchTerm) return;
        this.memberSearchResults.set(response.items ?? []);
        this.memberPickerOpen.set(true);
      });
  }

  fullName(member: Member): string {
    return `${member.firstName} ${member.lastName}`.trim();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  notifySuccess(summary: string, detail: string): void {
    this.messages.add({ severity: 'success', summary, detail });
  }

  notifyError(summary: string, detail: string): void {
    this.messages.add({ severity: 'error', summary, detail });
  }

  private apiErrorMessage(error: {
    error?: unknown;
  }): string {
    const payload = error?.error;

    if (typeof payload === 'string' && payload.trim()) return payload;
    if (!payload || typeof payload !== 'object') return 'Please verify the member and try again.';

    const body = payload as {
      detail?: unknown;
      title?: unknown;
      message?: unknown;
      error?: unknown;
      errors?: Record<string, unknown> | unknown[];
    };
    const directMessage = [body.detail, body.message, body.title, body.error].find(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );
    if (directMessage) return directMessage;

    if (Array.isArray(body.errors)) {
      const messages = body.errors.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      );
      if (messages.length) return messages.join(' ');
    }

    if (body.errors && typeof body.errors === 'object') {
      const messages = Object.values(body.errors)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
      if (messages.length) return messages.join(' ');
    }

    return 'Please verify the member and try again.';
  }
}
