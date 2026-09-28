import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from 'auth';
import { MemberService } from '../../../shared/services/member.service';

@Component({
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, PasswordModule, ToastModule],
  providers: [MessageService],
  selector: 'app-member-security',
  styleUrl: './security.scss',
  templateUrl: './security.html',
})
export class Security {
  private readonly memberService = inject(MemberService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly messages = inject(MessageService);
  saving = signal(false);
  memberId = signal<number | null>(null);
  passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  constructor() {
    this.memberService.getMe().subscribe({ next: (member) => this.memberId.set(member.memberId) });
  }

  passwordsMatch(): boolean {
    return this.passwordForm.controls.newPassword.value === this.passwordForm.controls.confirmPassword.value;
  }

  strength(): string {
    const value = this.passwordForm.controls.newPassword.value;
    if (value.length >= 10 && /[A-Z]/.test(value) && /\d/.test(value)) return 'Strong';
    if (value.length >= 6) return 'Good';
    return 'Add 6+ characters';
  }

  changePassword(): void {
    const memberId = this.memberId();
    if (!memberId || this.passwordForm.invalid || !this.passwordsMatch()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.auth.updatePassword({ memberId, currentPassword, newPassword }).subscribe({
      next: () => {
        this.saving.set(false);
        this.passwordForm.reset();
        this.messages.add({ severity: 'success', summary: 'Password updated', detail: 'Your account is secured with the new password.' });
      },
      error: (error) => {
        this.saving.set(false);
        this.messages.add({ severity: 'error', summary: 'Could not update password', detail: error?.error?.detail ?? error?.error?.title ?? 'Check your current password and try again.' });
      },
    });
  }
}

