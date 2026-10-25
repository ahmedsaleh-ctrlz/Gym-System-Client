import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, Roles } from 'auth';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-google-oauth',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule, TranslatePipe],
  templateUrl: './oauth-google.html',
  styleUrl: './oauth-google.scss',
})
export class GoogleOAuth {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);

  readonly state = signal<'loading' | 'registration' | 'error' | 'invalid'>('invalid');
  readonly errorCode = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly maxBirthDate = this.localDateString();

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    dateOfBirth: ['', Validators.required],
    phoneNumber: ['', [Validators.required, Validators.maxLength(30)]],
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const status = params.get('status');
    const error = params.get('error');

    // Clear transient OAuth parameters without triggering a second callback.
    this.location.replaceState(this.router.url.split(/[?#]/, 1)[0]);

    if (error) {
      this.showError(error);
    } else if (status === 'complete_google_login') {
      this.completeGoogleLogin();
    } else {
      this.state.set('invalid');
    }
  }

  private completeGoogleLogin(): void {
    this.state.set('loading');
    this.authService.completeGoogleLogin().subscribe({
      next: (outcome) => {
        switch (outcome.status) {
          case 'Authenticated':
            if (!outcome.tokens?.accessToken || !outcome.tokens.refreshToken) {
              this.showError('complete_failed');
              return;
            }
            // AuthService persists the returned tokens once.
            this.navigateAfterLogin();
            return;
          case 'RegistrationRequired':
            this.state.set('registration');
            this.errorCode.set(null);
            return;
          case 'EmailVerificationRequired':
            this.showError('google_email_not_verified');
            return;
          case 'SessionExpired':
            this.showError('external_session_expired');
            return;
          default:
            this.showError('complete_failed');
        }
      },
      error: (error: HttpErrorResponse) => this.handleCompletionError(error),
    });
  }

  private handleCompletionError(error: HttpErrorResponse): void {
    const responseStatus = error.error?.status;
    const responseCode = error.error?.code;
    if (error.status === 401 || responseStatus === 'SessionExpired') {
      this.showError('external_session_expired');
    } else if (
      responseStatus === 'EmailVerificationRequired' ||
      responseCode === 'google_email_not_verified'
    ) {
      this.showError('google_email_not_verified');
    } else {
      this.showError('complete_failed');
    }
  }

  private showError(code: string): void {
    this.state.set('error');
    this.errorCode.set(code);
  }

  private navigateAfterLogin(): void {
    const destination = this.authService.getRole() === Roles.Admin
      ? '/admin/dashboard'
      : '/member/home';
    void this.router.navigateByUrl(destination);
  }

  submit(): void {
    this.submitted.set(true);
    if (this.form.invalid || this.isFutureDate()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorCode.set(null);
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.authService
      .registerGoogleMember({
        firstName: value.firstName.trim(),
        lastName: value.lastName.trim(),
        dateOfBirth: `${value.dateOfBirth}T00:00:00`,
        phoneNumber: value.phoneNumber.trim(),
        imageUrl: null,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.navigateAfterLogin();
        },
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          if (error.status === 401) {
            this.showError('external_session_expired');
          } else if (error.status === 429) {
            this.errorCode.set('rate_limited');
          } else if (error.error?.code) {
            this.errorCode.set(String(error.error.code));
          } else {
            this.errorCode.set('registration_failed');
          }
        },
      });
  }

  restartGoogle(): void {
    this.authService.startGoogleLogin();
  }

  isInvalid(name: string): boolean {
    const control = this.form.get(name);
    return !!control?.invalid && (control.dirty || control.touched || this.submitted());
  }

  isFutureDate(): boolean {
    const value = this.form.controls.dateOfBirth.value;
    return !!value && value > this.maxBirthDate;
  }

  error(name: string): string {
    const control = this.form.get(name);
    if (control?.hasError('required')) return 'googleOAuth.required';
    if (control?.hasError('maxlength')) return 'googleOAuth.tooLong';
    if (name === 'dateOfBirth' && this.isFutureDate()) return 'googleOAuth.futureDate';
    return 'googleOAuth.invalidField';
  }

  cancel(): void {
    void this.router.navigate(['/login']);
  }

  private localDateString(): string {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  }
}
