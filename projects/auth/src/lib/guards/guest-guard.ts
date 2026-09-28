import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth-service';
import { Roles } from '../enums/roles';

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isAuthenticated()) {
    return true;
  }
  if (authService.getRole() == Roles.Admin) {
    return router.createUrlTree(['/admin/dashboard']);
  }
  return router.createUrlTree(['/home']);
};
