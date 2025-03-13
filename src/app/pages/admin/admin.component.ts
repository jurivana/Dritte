import { Component, ElementRef, Signal, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { combineLatest, map } from 'rxjs';
import { Player } from '../../models/models';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, Validators } from '@angular/forms';

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
    active: ['' as any, Validators.required],
    paid: [true, Validators.required],
    coach: [false, Validators.required]
  });

  constructor(
    public fbService: FirebaseService,
    public authService: AuthService,
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
  }

  savePlayer(): void {
    let { id, name, whatsAppName, active, paid, coach } = this.playerForm.value;

    if (!(name && whatsAppName && active)) {
      return;
    }

    if (id) {
      this.fbService.updatePlayer(id, {});
    } else {
      this.fbService.addPlayer({ name, whatsAppName, active, paid, coach });
    }
    this.resetPlayerForm();
  }

  editPlayer(player: Player): void {
    this.playerForm.patchValue(player);
    this.playerModal.nativeElement.showModal();
  }

  resetPlayerForm(): void {
    this.playerForm.reset();
    this.playerModal.nativeElement.close();
  }
}
