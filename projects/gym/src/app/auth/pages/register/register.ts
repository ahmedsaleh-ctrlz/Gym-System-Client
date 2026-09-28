import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from 'auth';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { finalize, switchMap } from 'rxjs';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword
    ? { passwordsMismatch: true }
    : null;
}

@Component({
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    MessageModule,
    PasswordModule,
    ToastModule,
  ],
  providers: [MessageService],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly registrationComplete = signal(false);
  readonly stage = signal<'idle' | 'uploading' | 'creating'>('idle');
  readonly selectedFile = signal<File | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  readonly registerForm = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(80)]],
      lastName: ['', [Validators.required, Validators.maxLength(80)]],
      dateOfBirth: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      acceptedTerms: [false, Validators.requiredTrue],
    },
    { validators: passwordsMatch },
  );

  chooseFile(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Choose an image',
        detail: 'Please select a JPG, PNG, or WEBP image.',
      });
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.messageService.add({
        severity: 'error',
        summary: 'Image is too large',
        detail: 'Please choose an image smaller than 5 MB.',
      });
      input.value = '';
      return;
    }
    if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl()!);
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  removePhoto(input: HTMLInputElement): void {
    if (this.previewUrl()) URL.revokeObjectURL(this.previewUrl()!);
    this.previewUrl.set(null);
    this.selectedFile.set(null);
    input.value = '';
  }

  submit(): void {
    this.submitted.set(true);
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.registerForm.getRawValue();
    const upload$ = this.selectedFile() ? this.authService.uploadImage(this.selectedFile()!) : null;
    const request$ = upload$
      ? upload$.pipe(
          switchMap((response) =>
            this.createAccount(value, response.imageUrl ?? response.path ?? null),
          ),
        )
      : this.createAccount(value, null);
    if (upload$) this.stage.set('uploading');
    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => {
        this.stage.set('idle');
        this.registrationComplete.set(true);
        this.messageService.add({
          severity: 'success',
          summary: 'Account created',
          detail: 'Check your inbox to confirm your email.',
        });
      },
      error: (error: HttpErrorResponse) => {
        this.stage.set('idle');
        this.messageService.add({
          severity: 'error',
          summary: 'Registration failed',
          detail: error.error?.title ?? 'We could not create your account. Please try again.',
        });
      },
    });
  }

  private createAccount(value: ReturnType<typeof this.registerForm.getRawValue>, imageUrl: string | null) {
    this.stage.set('creating');
    return this.authService.register({
      firstName: value.firstName,
      lastName: value.lastName,
      dateOfBirth: new Date(`${value.dateOfBirth}T00:00:00`).toISOString(),
      phoneNumber: value.phoneNumber,
      email: value.email,
      password: value.password,
      imageUrl,
    });
  }

  isInvalid(name: string): boolean {
    const control = this.registerForm.get(name);
    return !!control?.invalid && (control.dirty || control.touched || this.submitted());
  }
  hasPasswordMismatch(): boolean {
    return (
      this.registerForm.hasError('passwordsMismatch') &&
      (this.registerForm.controls.confirmPassword.dirty || this.submitted())
    );
  }
  error(name: string): string {
    const control = this.registerForm.get(name);
    if (control?.hasError('required')) return 'This field is required.';
    if (control?.hasError('email')) return 'Enter a valid email address.';
    if (control?.hasError('minlength')) return 'Use at least 8 characters.';
    return 'Please check this field.';
  }
  login(): void {
    this.router.navigate(['/login']);
  }
}
