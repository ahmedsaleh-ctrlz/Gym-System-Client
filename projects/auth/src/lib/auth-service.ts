
import { Roles } from './enums/roles';
import { APP_CONFIG } from 'config';
import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { LoginRequest } from './models/login-request';
import { LoginResponse } from './models/login-response';
import { GoogleRegistrationRequest } from './models/google-registration-request';
import { GoogleLoginOutcome } from './models/google-login-outcome';
import { RegisterRequest } from './models/register-request';
import { UploadImageResponse } from './models/upload-image-response';
import { ResetPasswordRequest } from './models/reset-password-request';
import { Observable, tap } from 'rxjs';
import { TokenService } from './token-storage';
import { SKIP_AUTH } from './auth-interceptor';
import { TokenClaims } from './models/tokenClaims';
import { jwtDecode } from 'jwt-decode';


@Service()
export class AuthService {
  httpClient = inject(HttpClient);
  tokenService = inject(TokenService);
  private readonly config = inject(APP_CONFIG);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.httpClient
      .post<LoginResponse>(`${this.config.apiUrl}/Identity/token/generate`, request)
      .pipe(
        tap((response) => {
          this.tokenService.setTokens(response.accessToken, response.refreshToken);
        }),
      );
  }

  startGoogleLogin(): void {
    window.location.assign(`${this.config.apiUrl}/auth/external/google`);
  }

  completeGoogleLogin(): Observable<GoogleLoginOutcome> {
    return this.httpClient
      .post<GoogleLoginOutcome>(`${this.config.apiUrl}/auth/external/google/complete`, {}, {
        withCredentials: true,
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(
        tap((outcome) => {
          if (
            outcome.status === 'Authenticated' &&
            outcome.tokens?.accessToken &&
            outcome.tokens.refreshToken
          ) {
            this.tokenService.setTokens(outcome.tokens.accessToken, outcome.tokens.refreshToken);
          }
        }),
      );
  }

  registerGoogleMember(request: GoogleRegistrationRequest): Observable<LoginResponse> {
    return this.httpClient
      .post<LoginResponse>(`${this.config.apiUrl}/auth/external/google/register`, request, {
        withCredentials: true,
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .pipe(
        tap((response) => {
          this.tokenService.setTokens(response.accessToken, response.refreshToken);
        }),
      );
  }

  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.tokenService.getRefreshToken();
    const accessToken = this.tokenService.getAccessToken();
    return this.httpClient
      .post<LoginResponse>(`${this.config.apiUrl}/Identity/token/refresh-token`, {
        refreshToken,
        expiredAccessToken: accessToken,
      })
      .pipe(
        tap((response) => {
          this.tokenService.setTokens(response.accessToken, response.refreshToken);
        }),
      );
  }

  isAuthenticated(): boolean {
    return !!this.tokenService.getAccessToken();
  }

  private getClaims(): TokenClaims | null {
    const token = this.tokenService.getAccessToken();
    return token ? jwtDecode<TokenClaims>(token) : null;
  }

  getRole(): Roles | null {
    switch (this.getClaims()?.role) {
      case 'Admin':
        return Roles.Admin;
      case 'Coach':
        return Roles.Coach;
      case 'Member':
        return Roles.Member;
    }

    return null;
  }

  getCurrentUserId(): number | null {
    const subject = this.getClaims()?.sub;
    const memberId = Number(subject);
    return Number.isInteger(memberId) && memberId > 0 ? memberId : null;
  }

  ResendConfirmationEmail(email: string): Observable<void> {
    return this.httpClient.post<void>(`${this.config.apiUrlV2}/Identity/resend-confirmation-email`, {
      email,
    });
  }

  uploadImage(file: File): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post<UploadImageResponse>(
      `${this.config.apiUrl}/images/UploadImage`,
      formData,
    );
  }

  register(request: RegisterRequest): Observable<void> {
    return this.httpClient.post<void>(`${this.config.apiUrlV2}/Identity`, request);
  }

  forgetPassword(email: string): Observable<void> {
    return this.httpClient.post<void>(`${this.config.apiUrl}/Identity/forget-password`, {
      email: email,
    });
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.httpClient.post<void>(`${this.config.apiUrl}/Identity/reset-password`, request);
  }

  updatePassword(request: {
    memberId: number;
    currentPassword: string;
    newPassword: string;
  }): Observable<void> {
    return this.httpClient.put<void>(`${this.config.apiUrl}/Identity/update-password`, request);
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${this.config.apiUrl}/Identity/logout`, {
      refreshToken: this.tokenService.getRefreshToken() ?? '',
    });
  }

  clearSession(): void {
    this.tokenService.clear();
  }
}
