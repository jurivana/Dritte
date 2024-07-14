import { Injectable } from '@angular/core';
import {
  Auth,
  User,
  authState,
  signInWithEmailAndPassword,
  signOut,
} from '@angular/fire/auth';
import { Router } from '@angular/router';
import { ReplaySubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  loginFailed: boolean = false;
  isLoggedIn$ = new ReplaySubject<boolean>(1);

  constructor(private fbAuth: Auth, private router: Router) {
    authState(this.fbAuth).subscribe((user: User) => {
      this.isLoggedIn$.next(!!user);
    });
  }

  loginWithEmail(email: string, password: string): void {
    signInWithEmailAndPassword(this.fbAuth, email, password).then(() => {
      this.router.navigate(['admin']);
    }, () => {
      this.loginFailed = true;
    });
  }

  logout(): void {
    signOut(this.fbAuth);
  }
}
