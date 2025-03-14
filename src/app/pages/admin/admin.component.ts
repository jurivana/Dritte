import { Component, ElementRef, model, Signal, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { combineLatest, map } from 'rxjs';
import { Player } from '../../models/models';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { UtilService } from '../../services/util.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  standalone: false
})
export class AdminComponent {
  @ViewChild('playerModal') playerModal: ElementRef<HTMLDialogElement>;

  activePlayers: Signal<Player[]>;
  archivePlayers: Signal<Player[]>;

  playerForm = this.formBuilder.group({
    id: [''],
    name: ['', Validators.required],
    whatsAppName: ['', Validators.required],
    paid: [true, Validators.required],
    coach: [false, Validators.required]
  });
  playerActive: Player['active'];
  playerActiveDefault: Player['active'];
  seasons: string[];

  newSeasonText = model<string>('');
  newSeasonTextValidator: string;

  constructor(
    public fbService: FirebaseService,
    public authService: AuthService,
    public utilService: UtilService,
    private formBuilder: NonNullableFormBuilder
  ) {
    this.activePlayers = toSignal(
      combineLatest([this.fbService.players$, this.fbService.values$]).pipe(
        map(([players, values]) => players.filter(player => player.active[values.season]))
      ),
      { initialValue: [] }
    );
    this.archivePlayers = toSignal(
      combineLatest([this.fbService.players$, this.fbService.values$]).pipe(
        map(([players, values]) => players.filter(player => !player.active[values.season]))
      ),
      { initialValue: [] }
    );
    this.fbService.values$.subscribe(values => {
      this.playerActiveDefault = {};
      for (let i = 24; i < +values.season; i++) {
        this.playerActiveDefault[i] = false;
      }
      this.playerActiveDefault[values.season] = true;
      this.playerActive = { ...this.playerActiveDefault };
      this.seasons = Object.keys(this.playerActiveDefault).sort((a, b) => +b - +a);
      this.newSeasonTextValidator = `20${+values.season + 1}/${+values.season + 2}`;
    });
  }

  savePlayer(): void {
    let { id, name, whatsAppName, paid, coach } = this.playerForm.value;

    if (!(name && whatsAppName)) {
      return;
    }

    const player: Omit<Player, 'id'> = { name, whatsAppName, paid, coach, active: this.playerActive };
    if (id) {
      this.fbService.updatePlayer(id, player);
    } else {
      this.fbService.addPlayer(player);
    }
    this.resetPlayerForm();
  }

  editPlayer(player: Player): void {
    this.playerForm.patchValue(player);
    this.playerActive = player.active;
    this.playerModal.nativeElement.showModal();
    this.playerModal.nativeElement.focus();
    this.playerModal.nativeElement.blur();
  }

  resetPlayerForm(): void {
    this.playerModal.nativeElement.close();
    this.playerForm.reset();
    this.playerActive = { ...this.playerActiveDefault };
  }

  startNewSeason(): void {
    const newSeason = +this.fbService.values.season + 1;
    for (const player of this.fbService.players) {
      player.active[newSeason] = player.active[newSeason - 1];
      this.fbService.updatePlayer(player.id, { active: player.active });
    }
    this.fbService.updateValues({ season: newSeason.toString() });
  }
}
