import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth-service';
import { LoginResponse } from './models/login-response';
import { TokenService } from './token-storage';

let refreshTokenRequest$: Observable<LoginResponse> | null = null;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);

  const accessToken = tokenService.getAccessToken();

  if (accessToken) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) {
        return throwError(() => err);
      }

      if (req.url.includes('/Identity/token/refresh-token')) {
        tokenService.clear();
        return throwError(() => err);
      }

      if (!refreshTokenRequest$) {
        refreshTokenRequest$ = authService.refreshToken().pipe(
          catchError((refreshError: HttpErrorResponse) => {
            tokenService.clear();
            return throwError(() => refreshError);
          }),
          shareReplay(1),
          finalize(() => {
            refreshTokenRequest$ = null;
          }),
        );
      }

      return refreshTokenRequest$.pipe(
        switchMap((newTokens) => {
          const retryRequest = req.clone({
            setHeaders: {
              Authorization: `Bearer ${newTokens.accessToken}`,
            },
          });

          return next(retryRequest).pipe(
            catchError((retryError: HttpErrorResponse) => {
              tokenService.clear();
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
