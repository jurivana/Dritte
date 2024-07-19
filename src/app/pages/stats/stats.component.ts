import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { BehaviorSubject, combineLatest, firstValueFrom, map, Observable, Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { Fee, FeeTypeIcon, Player, PlayerSummary } from '../../models/models';
import { AuthService } from '../../services/auth.service';
import { FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnInit, OnDestroy {
  @ViewChild('feeModal') feeModal: ElementRef<HTMLDialogElement>;

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
  feeForm: FormGroup;

  players$: Observable<Player[]>;

  destroyed$ = new Subject<void>();

  constructor(
    public fbService: FirebaseService,
    public authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: NonNullableFormBuilder
  ) {}

  ngOnInit(): void {
    this.feeForm = this.formBuilder.group({
      id: ['', Validators.required],
      playerId: ['', Validators.required],
      date: [this.dateForInput(new Date()), Validators.required],
      type: ['fine', Validators.required],
      punishment: [''],
      comment: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.pattern(/\d+/)]],
      value: ['', [Validators.required, Validators.pattern(/-?\d+/)]]
    });

    combineLatest([this.fbService.values$, this.route.paramMap])
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([values, paramMap]) => {
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

    combineLatest([this.season$, this.playerId$, this.fbService.fees$, this.feeLength$])
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([season, playerId, fees, feeLength]) => {
        fees = fees.filter(f => f.season === season && (!playerId || f.playerId === playerId));
        this.canExtendFees = feeLength < fees.length;
        this.fees$.next(fees.slice(0, feeLength));
      });

    this.playerSummary$ = combineLatest([this.fbService.playerSummary$, this.playerId$]).pipe(
      map(([summaries, playerId]) => summaries.find(s => s.playerId === playerId)!)
    );

    this.players$ = combineLatest([this.fbService.players$, this.fbService.values$]).pipe(
      map(([players, values]) => players.filter(player => player.active[values.season]))
    );
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
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

  async saveFee() {
    const { id, playerId, date, type, comment, quantity, value } = this.feeForm.value;
    if (!(playerId && date && type && comment && quantity && value)) {
      this.resetFeeForm();
      return;
    }

    this.fbService.updateFee(id, {
      playerId,
      type,
      comment,
      quantity,
      value,
      date: new Date(date)
    });

    this.resetFeeForm();
  }

  editFee(fee: Fee): void {
    let punishment = '';
    if (fee.type === 'fine') {
      punishment = this.fbService.punishments.find(p => p.name === fee.comment)?.id ?? '';
    }
    this.feeForm.patchValue({
      ...fee,
      date: this.dateForInput(fee.date),
      punishment
    });
    this.feeModal.nativeElement.showModal();
  }

  deleteFee(): void {
    if (!this.feeForm.value.id) {
      return;
    }
    this.fbService.deleteFee(this.feeForm.value.id);
    this.resetFeeForm();
  }

  punishmentChanged(): void {
    const punishment = this.fbService.punishments.find(p => p.id === this.feeForm.value.punishment);
    this.feeForm.get('comment')?.setValue(punishment?.name);
    this.updateValue();
  }

  updateValue() {
    if (this.feeForm.value.type === 'fine') {
      const punishment = this.fbService.punishments.find(p => p.id === this.feeForm.value.punishment);
      if (punishment) {
        this.feeForm.get('value')?.setValue(this.feeForm.value.quantity * punishment.value);
      }
    }
  }

  resetFeeForm(): void {
    this.feeForm.reset();
    this.feeModal.nativeElement.close();
  }

  select(event: FocusEvent): void {
    const target = event.target as HTMLInputElement;
    target.select();
  }

  dateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
