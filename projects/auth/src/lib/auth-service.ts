import { Roles } from './enums/roles';
import { appConfig } from 'config';
import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { LoginRequest } from './models/login-request';
import { LoginResponse } from './models/login-response';
import { RegisterRequest } from './models/register-request';
import { UploadImageResponse } from './models/upload-image-response';
import { ResetPasswordRequest } from './models/reset-password-request';
import { Observable, tap } from 'rxjs';
import { TokenService } from './token-storage';

import { TokenClaims } from './models/tokenClaims';
import { jwtDecode } from 'jwt-decode';

@Service()
export class AuthService {
  httpClient = inject(HttpClient);
  tokenService = inject(TokenService);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.httpClient
      .post<LoginResponse>(`${appConfig.apiUrl}/Identity/token/generate`, request)
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
      .post<LoginResponse>(`${appConfig.apiUrl}/Identity/token/refresh-token`, {
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
    return this.httpClient.post<void>(`${appConfig.apiUrlV2}/Identity/resend-confirmation-email`, {
      email,
    });
  }

  uploadImage(file: File): Observable<UploadImageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.httpClient.post<UploadImageResponse>(
      `${appConfig.apiUrl}/images/UploadImage`,
      formData,
    );
  }

  register(request: RegisterRequest): Observable<void> {
    return this.httpClient.post<void>(`${appConfig.apiUrlV2}/Identity`, request);
  }

  forgetPassword(email: string): Observable<void> {
    return this.httpClient.post<void>(`${appConfig.apiUrl}/Identity/forget-password`, {
      email: email,
    });
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.httpClient.post<void>(`${appConfig.apiUrl}/Identity/reset-password`, request);
  }

  updatePassword(request: {
    memberId: number;
    currentPassword: string;
    newPassword: string;
  }): Observable<void> {
    return this.httpClient.put<void>(`${appConfig.apiUrl}/Identity/update-password`, request);
  }

  logout(): Observable<void> {
    return this.httpClient.post<void>(`${appConfig.apiUrl}/Identity/logout`, {
      refreshToken: this.tokenService.getRefreshToken() ?? '',
    });
  }

  clearSession(): void {
    this.tokenService.clear();
  }
}
