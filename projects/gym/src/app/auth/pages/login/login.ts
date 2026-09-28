import { AuthService, LoginRequest, Roles } from 'auth';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputPasswordModule } from 'primeng/inputpassword';
import { Eye } from '@primeicons/angular/eye';
import { EyeSlash } from '@primeicons/angular/eye-slash';
import {
  FormControl,
  FormGroup,
  FormsModule,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { RippleModule } from 'primeng/ripple';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { DialogModule } from 'primeng/dialog';
import { RouterLink } from '@angular/router';

@Component({
  imports: [
    InputTextModule,
    PasswordModule,
    ButtonModule,
    RouterLink,
    IconFieldModule,
    InputIconModule,
    InputPasswordModule,
    FormsModule,
    Eye,
    EyeSlash,
    ReactiveFormsModule,
    MessageModule,
    ToastModule,
    RippleModule,
    DialogModule,
    ButtonModule,
  ],
  selector: 'app-login',
  styleUrl: './login.scss',
  templateUrl: './login.html',
  standalone: true,
  providers: [MessageService],
})
export class Login {
  //services
  authService = inject(AuthService);
  messageService = inject(MessageService);
  router = inject(Router);

  showEmailConfirmationDialog = signal<boolean>(false);
  showForgotPasswordDialog = signal<boolean>(false);
  forgotPasswordLoading = signal(false);
  resendCooldown = signal(0);
  email: FormControl = new FormControl('', [Validators.required, Validators.email]);
  password: FormControl = new FormControl('', [Validators.required, Validators.minLength(6)]);
  forgotEmail: FormControl = new FormControl('', [Validators.required, Validators.email]);
  LoginForm: FormGroup = new FormGroup({
    email: this.email,
    password: this.password,
  });

  mask: boolean = true;

  isInvalid(controlName: string): boolean {
    const control = this.LoginForm.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  getErrorMessage(controlName: string): string {
    const control = this.LoginForm.get(controlName);
    if (!control?.errors) {
      return '';
    }
    if (control.errors['required']) {
      return 'This field is required';
    }
    if (control.errors['email']) {
      return 'Invalid email';
    }
    if (control.errors['minlength']) {
      return 'Minimum length is 6 characters';
    }
    return 'Invalid value';
  }

  submitForm(): void {
    if (this.LoginForm.invalid) {
      this.LoginForm.markAllAsTouched();
      this.LoginForm.markAllAsDirty();
      return;
    }
    this.login({
      email: this.email.value,
      password: this.password.value,
    });
  }

  login(data: LoginRequest): void {
    this.authService.login(data).subscribe({
      next: (response) => {
        this.showSuccess('sucssess', 'Login Successfully , Welcome Back');
        this.authService.getRole() == Roles.Admin
          ? this.router.navigate(['./admin/dashboard'])
          : this.router.navigate(['./member/home']);
      },
      error: (error: HttpErrorResponse) => {
        this.showError('Login Failed', error.error.title);
        if (error.error.code == 'Email_Not_Confirmed') {
          this.showEmailConfirmationDialog.set(true);
        }
      },
    });
  }

  showSuccess(summary: string, detail: string) {
    this.messageService.add({
      severity: 'success',
      summary: summary,
      detail: detail,
    });
  }

  showError(summary: string, detail: string) {
    this.messageService.add({
      severity: 'error',
      summary: summary,
      detail: detail,
    });
  }

  ngOnDestroy(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
  }

  private resendInterval?: ReturnType<typeof setInterval>;

  resendConfirmationEmail(): void {
    if (this.resendCooldown() > 0) {
      return;
    }

    this.authService.ResendConfirmationEmail(this.email.value).subscribe({
      next: () => {
        this.showSuccess(
          'successfull',
          'Confirmation Email Sended Successfully , Check your inbox',
        );
        this.startResendCooldown();
      },
    });
  }

  openForgotPassword(): void {
    this.forgotEmail.setValue(this.email.value ?? '');
    this.forgotEmail.markAsPristine();
    this.forgotEmail.markAsUntouched();
    this.showForgotPasswordDialog.set(true);
  }

  submitForgotPassword(): void {
    if (this.forgotEmail.invalid) {
      this.forgotEmail.markAsTouched();
      return;
    }

    this.forgotPasswordLoading.set(true);
    this.authService.forgetPassword(this.forgotEmail.value).subscribe({
      next: () => {
        this.forgotPasswordLoading.set(false);
        this.showForgotPasswordDialog.set(false);
        this.showSuccess('Check your inbox', 'If an account exists for this email, a reset link is on its way.');
      },
      error: (error: HttpErrorResponse) => {
        this.forgotPasswordLoading.set(false);
        this.showError('Could not send reset link', error.error?.title ?? 'Please check the email and try again.');
      },
    });
  }

  private startResendCooldown(): void {
    this.resendCooldown.set(60);

    this.resendInterval = setInterval(() => {
      this.resendCooldown.update((value) => value - 1);

      if (this.resendCooldown() <= 0) {
        clearInterval(this.resendInterval);
        this.resendInterval = undefined;
      }
    }, 1000);
  }
}
