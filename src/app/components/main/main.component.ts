import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase.service';
import { map, Observable } from 'rxjs';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.scss'
})
export class MainComponent {
  seasons$: Observable<number[]>;

  constructor(
    public authService: AuthService,
    public router: Router,
    public fbService: FirebaseService
  ) {
    this.seasons$ = this.fbService.values$.pipe(
      map(values => {
        const seasons = [];
        for (let i = 24; i <= +values.season; i++) {
          seasons.push(i);
        }
        return seasons;
      })
    );
  }
}
