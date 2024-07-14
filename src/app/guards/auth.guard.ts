import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  return firstValueFrom(inject(AuthService).isLoggedIn$).then(() => true);
};
