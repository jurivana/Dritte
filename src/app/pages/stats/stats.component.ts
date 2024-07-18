import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { BehaviorSubject, combineLatest, map, Observable, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Fee } from '../../models/models';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnInit {
  seasons$ = new BehaviorSubject<number[]>([24]);

  season: string;
  season$ = new Subject<string>();
  playerId: string = '';
  playerId$ = new Subject<string | null>();

  fees$ = new Observable<Fee[]>();

  constructor(
    public fbService: FirebaseService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    combineLatest([this.fbService.values$, this.route.paramMap]).subscribe(([values, paramMap]) => {
      const season = paramMap.get('season');
      if (!season) {
        this.router.navigate(['stats', +values.season]);
        return;
      }

      const seasons = [];
      for (let i = 24; i <= +values.season; i++) {
        seasons.push(i);
      }
      this.seasons$.next(seasons);

      this.season = season;
      this.season$.next(season);

      this.playerId = paramMap.get('player') ?? '';
      this.playerId$.next(this.playerId);
    });

    this.fees$ = combineLatest([this.season$, this.playerId$, this.fbService.fees$]).pipe(
      map(([season, playerId, fees]) => {
        return fees.filter(f => f.season === season && (!playerId || f.playerId === playerId));
      })
    );
  }

  seasonChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.router.navigate(['stats', target.value, this.playerId]);
  }

  playerChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.router.navigate(['stats', this.season, target.value]);
  }
}
