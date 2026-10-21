import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    // Check if account suspended
    if (authService.currentUser()?.status === 'suspended') {
      router.navigate(['/auth/suspended']);
      return false;
    }
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

