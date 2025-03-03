import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-main',
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
    standalone: false
})
export class MainComponent {
  constructor(
    public authService: AuthService,
    public router: Router
  ) {}
}
