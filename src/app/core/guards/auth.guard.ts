import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Blocks access unless the user is logged in. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.user()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

/** Blocks access unless the user's role is in the allowed list. */
export const roleGuard = (allowed: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const role = auth.user()?.role;
  if (role && allowed.includes(role)) {
    return true;
  }
  return router.createUrlTree(['/dashboard']);
};