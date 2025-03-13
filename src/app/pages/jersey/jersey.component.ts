import { Component, ElementRef, model, OnInit, Signal, signal, ViewChild } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { Jersey, JerseySummary, Player } from '../../models/models';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { deleteField } from '@angular/fire/firestore';

@Component({
  selector: 'app-jersey',
  templateUrl: './jersey.component.html',
  styleUrl: './jersey.component.scss',
  standalone: false
})
export class JerseyComponent implements OnInit {
  @ViewChild('jerseyModal') jerseyModal: ElementRef<HTMLDialogElement>;

  jerseyForm = this.formBuilder.group({
    id: [''],
    playerId: ['', Validators.required],
    date: [this.dateForInput(new Date())]
  });

  jerseySummary$ = new Observable<JerseySummary[]>();
  summaryLength$ = new BehaviorSubject<number>(7);
  canExtendSummary: boolean;

  players: Signal<Player[]>;

  constructor(
    public fbService: FirebaseService,
    public authService: AuthService,
    private formBuilder: NonNullableFormBuilder
  ) {
    this.players = toSignal(
      combineLatest([this.fbService.players$, this.fbService.values$]).pipe(
        map(([players, values]) => players.filter(player => player.active[values.season] && !player.coach))
      ),
      { initialValue: [] }
    );
  }

  ngOnInit(): void {
    this.jerseySummary$ = combineLatest([this.fbService.jerseySummary$, this.summaryLength$]).pipe(
      map(([jerseySummary, summaryLength]) => {
        this.canExtendSummary = summaryLength < jerseySummary.length;
        return jerseySummary.slice(0, summaryLength);
      })
    );
  }

  saveJersey(): void {
    let { id, playerId } = this.jerseyForm.value;
    if (!playerId) {
      return;
    }

    const jersey: Partial<Jersey> = { playerId };
    if (this.jerseyForm.value.date) {
      jersey.date = new Date(this.jerseyForm.value.date);
    }
    if (id) {
      this.fbService.updateJersey(id, jersey);
    } else {
      this.fbService.addJersey({ ...(jersey as Jersey), season: this.fbService.values.season });
    }
    this.resetJerseyForm();
  }

  editJersey(jersey: Jersey): void {
    this.jerseyForm.patchValue({
      ...jersey,
      date: this.dateForInput(jersey.date)
    });
    this.jerseyModal.nativeElement.showModal();
  }

  deleteJersey(): void {
    if (!this.jerseyForm.value.id) {
      return;
    }
    this.fbService.deleteJersey(this.jerseyForm.value.id);
    this.resetJerseyForm();
  }

  resetJerseyForm(): void {
    this.jerseyForm.reset();
    this.jerseyModal.nativeElement.close();
  }

  increaseSummaryLength(): void {
    this.summaryLength$.next(this.summaryLength$.value + 5);
  }

  dateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
