import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from 'auth';
import { MemberProfile } from '../../shared/models/member-area.models';
import { MemberService } from '../../../shared/services/member.service';
import { memberFullName, memberImageUrl, memberInitials } from '../../shared/member.helpers';

@Component({
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, ToastModule],
  providers: [MessageService],
  selector: 'app-member-profile',
  styleUrl: './profile.scss',
  templateUrl: './profile.html',
})
export class Profile {
  private readonly memberService = inject(MemberService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);

  profile = signal<MemberProfile | null>(null);
  loading = signal(true);
  saving = signal(false);
  uploading = signal(false);
  previewUrl = signal<string | null>(null);
  profileForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: [{ value: '', disabled: true }],
    phoneNumber: ['', [Validators.required, Validators.maxLength(30)]],
    dateOfBirth: ['', Validators.required],
    joinDate: [{ value: '', disabled: true }],
    notes: [''],
  });
  readonly imageUrl = memberImageUrl;
  readonly initials = memberInitials;
  readonly fullName = memberFullName;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.memberService.getMe().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.profileForm.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phoneNumber: profile.phoneNumber,
          dateOfBirth: this.dateOnly(profile.dateOfBirth),
          joinDate: this.dateOnly(profile.joinDate),
          notes: profile.notes ?? '',
        });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not load profile', detail: 'Please refresh and try again.' });
      },
    });
  }

  save(): void {
    const profile = this.profile();
    if (!profile || this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const value = this.profileForm.getRawValue();
    this.memberService.updateMember(profile.memberId, {
      firstName: value.firstName,
      lastName: value.lastName,
      dateOfBirth: value.dateOfBirth,
      phoneNumber: value.phoneNumber,
      joinDate: value.joinDate,
      notes: value.notes || null,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.messages.add({ severity: 'success', summary: 'Profile updated', detail: 'Your personal details are up to date.' });
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not save profile', detail: error?.error?.detail ?? error?.error?.title ?? 'Please review the form.' });
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const profile = this.profile();
    if (!file || !profile) return;
    if (!file.type.startsWith('image/')) {
      this.messages.add({ severity: 'error', summary: 'Choose an image', detail: 'Please select a JPG, PNG or another image file.' });
      return;
    }
    this.previewUrl.set(URL.createObjectURL(file));
    this.uploading.set(true);
    this.auth.uploadImage(file).subscribe({
      next: (response) => {
        const imageUrl = response.imageUrl ?? response.path;
        if (!imageUrl) {
          this.uploading.set(false);
          this.messages.add({ severity: 'error', summary: 'Upload incomplete', detail: 'The image service did not return an image URL.' });
          return;
        }
        this.memberService.updateMemberImage(profile.memberId, { imageUrl }).subscribe({
          next: () => {
            this.uploading.set(false);
            this.messages.add({ severity: 'success', summary: 'Photo updated', detail: 'Your profile photo is now live.' });
            this.load();
          },
          error: () => {
            this.uploading.set(false);
            this.messages.add({ severity: 'error', summary: 'Photo update failed', detail: 'The image uploaded but could not be linked to your profile.' });
          },
        });
      },
      error: () => {
        this.uploading.set(false);
        this.messages.add({ severity: 'error', summary: 'Upload failed', detail: 'Please choose another image and try again.' });
      },
    });
  }

  dateOnly(value: string | null): string {
    return value ? value.slice(0, 10) : '';
  }
}

