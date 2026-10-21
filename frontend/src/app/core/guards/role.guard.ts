import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as Array<'admin' | 'teacher' | 'student'>;
  const userRole = authService.currentUser()?.role;

  if (userRole && allowedRoles && allowedRoles.includes(userRole)) {
    return true;
  }

  router.navigate(['/error/403']);
  return false;
};

