import { Component, OnInit } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { BehaviorSubject, combineLatest, map, Observable, Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Fee, FeeTypeIcon, PlayerSummary } from '../../models/models';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnInit {
  seasons$ = new BehaviorSubject<number[]>([24]);

  season: string;
  season$ = new BehaviorSubject<string | null>(null);
  playerId: string = '';
  playerId$ = new BehaviorSubject<string | null>(null);

  playerSummary$ = new Observable<PlayerSummary>();
  fees$ = new BehaviorSubject<Fee[]>([]);
  feeLength$ = new BehaviorSubject<number>(7);
  canExtendFees: boolean;
  feeTypeIcon = FeeTypeIcon;

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

    combineLatest([this.season$, this.playerId$, this.fbService.fees$, this.feeLength$]).subscribe(
      ([season, playerId, fees, feeLength]) => {
        fees = fees.filter(f => f.season === season && (!playerId || f.playerId === playerId));
        this.canExtendFees = feeLength < fees.length;
        this.fees$.next(fees.slice(0, feeLength));
      }
    );

    this.playerSummary$ = combineLatest([this.fbService.playerSummary$, this.playerId$]).pipe(
      map(([summaries, playerId]) => summaries.find(s => s.playerId === playerId)!)
    );
  }

  seasonChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.feeLength$.next(7);
    this.router.navigate(['stats', target.value, this.playerId]);
  }

  playerChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.feeLength$.next(7);
    this.router.navigate(['stats', this.season, target.value]);
  }

  increaseFeeLength(): void {
    this.feeLength$.next(this.feeLength$.value + 10);
  }
}
