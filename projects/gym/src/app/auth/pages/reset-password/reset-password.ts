import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from 'auth';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirmation = control.get('confirmPassword')?.value;
  return password && confirmation && password !== confirmation ? { passwordsMismatch: true } : null;
}

@Component({
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, ToastModule],
  providers: [MessageService],
  selector: 'app-reset-password',
  styleUrl: './reset-password.scss',
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly complete = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmation = signal(false);
  readonly submitted = signal(false);
  readonly email = signal('');
  readonly resetToken = signal('');

  readonly resetForm = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    this.readResetLink();
  }

  submit(): void {
    this.submitted.set(true);
    if (this.resetForm.invalid || !this.email() || !this.resetToken()) {
      this.resetForm.markAllAsTouched();
      if (!this.email() || !this.resetToken()) this.messages.add({ severity: 'error', summary: 'Invalid reset link', detail: 'Please request a new password reset email.' });
      return;
    }

    this.submitting.set(true);
    this.authService.resetPassword({ email: this.email(), resetToken: this.resetToken(), newPassword: this.resetForm.controls.newPassword.value }).subscribe({
      next: () => { this.submitting.set(false); this.complete.set(true); },
      error: (error: HttpErrorResponse) => { this.submitting.set(false); this.messages.add({ severity: 'error', summary: 'Could not reset password', detail: error.error?.title ?? 'This link may have expired. Request a new one and try again.' }); },
    });
  }

  isInvalid(name: string): boolean { const control = this.resetForm.get(name); return !!control?.invalid && (control.dirty || control.touched || this.submitted()); }
  hasMismatch(): boolean { return this.resetForm.hasError('passwordsMismatch') && (this.resetForm.controls.confirmPassword.dirty || this.submitted()); }
  error(name: string): string { const control = this.resetForm.get(name); if (control?.hasError('required')) return 'This field is required.'; if (control?.hasError('minlength')) return 'Use at least 8 characters.'; return 'Please check this field.'; }

  private readResetLink(): void {
    const query = this.route.snapshot.queryParamMap;
    let email = query.get('email') ?? '';
    let token = query.get('token') ?? '';
    const payload = this.route.snapshot.paramMap.get('payload');

    if (payload) {
      const decoded = this.decode(payload);
      email = email || this.extract(decoded, 'email');
      token = token || this.extract(decoded, 'token');
    }

    this.email.set(email);
    this.resetToken.set(token);
  }

  private extract(value: string, key: string): string {
    const match = value.match(new RegExp(`${key}=([^&\\s]+)`, 'i'));
    return match ? this.decode(match[1]) : '';
  }

  private decode(value: string): string {
    try { return decodeURIComponent(value.replace(/\+/g, ' ')).trim(); } catch { return value.trim(); }
  }

  goToLogin(): void { this.router.navigate(['/login']); }
}
