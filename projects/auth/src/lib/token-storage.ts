import { Service } from '@angular/core';

@Service()
export class TokenService {
  private readonly accessToken = 'auth-token';
  private readonly refreshToken = 'refresh-token';

  getAccessToken(): string | null {
    return localStorage.getItem(this.accessToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshToken);
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.accessToken, accessToken);
    localStorage.setItem(this.refreshToken, refreshToken);
  }

  clear(): void {
    localStorage.removeItem(this.accessToken);
    localStorage.removeItem(this.refreshToken);
  }
}
