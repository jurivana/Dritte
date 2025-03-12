import { Injectable } from '@angular/core';
import {
  DocumentReference,
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, ReplaySubject, combineLatest } from 'rxjs';
import {
  Balance,
  Fee,
  Jersey,
  JerseySummary,
  Payment,
  Player,
  PlayerSummary,
  Punishment,
  Values
} from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  values: Values;
  values$ = new ReplaySubject<Values>(1);
  players: Player[];
  players$ = new ReplaySubject<Player[]>(1);
  punishments: Punishment[];
  punishments$ = new ReplaySubject<Punishment[]>(1);
  fees: Fee[];
  fees$ = new ReplaySubject<Fee[]>(1);
  payments: Payment[];
  payments$ = new ReplaySubject<Payment[]>(1);
  jerseys: Jersey[];
  jerseys$ = new ReplaySubject<Jersey[]>(1);
  jerseySummary: JerseySummary[];
  jerseySummary$ = new ReplaySubject<JerseySummary[]>(1);
  playerSummary: PlayerSummary[];
  playerSummary$ = new ReplaySubject<PlayerSummary[]>(1);
  pendingFees$ = new ReplaySubject<number>(1);
  balance$ = new ReplaySubject<Balance>(1);

  constructor(private firestore: Firestore) {
    combineLatest([
      docData(doc(this.firestore, 'values/0')) as Observable<Values>,
      collectionData(collection(this.firestore, 'players'), { idField: 'id' }) as Observable<Player[]>,
      collectionData(collection(this.firestore, 'fees'), { idField: 'id' }) as Observable<Fee[]>,
      collectionData(collection(this.firestore, 'payments'), { idField: 'id' }) as Observable<Payment[]>,
      collectionData(collection(this.firestore, 'punishments'), { idField: 'id' }) as Observable<Punishment[]>,
      collectionData(collection(this.firestore, 'jerseys'), { idField: 'id' }) as Observable<Jersey[]>
    ]).subscribe(([values, players, fees, payments, punishments, jerseys]) => {
      this.values = values;
      this.values$.next(values);

      this.players = players.sort((a, b) => a.name.localeCompare(b.name));
      this.players$.next(this.players);

      this.fees = fees
        .map(fee => ({
          ...fee,
          date: fee.date.toDate(),
          playerName: players.find(player => player.id === fee.playerId)?.name
        }))
        .sort((a, b) => b.date - a.date || a.playerName!.localeCompare(b.playerName!));
      this.fees$.next(this.fees);

      this.payments = payments
        .map(payment => ({
          ...payment,
          date: payment.date.toDate()
        }))
        .sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
      this.payments$.next(this.payments);

      this.jerseys = jerseys
        .filter(jersey => jersey.season === values.season)
        .map(jersey => ({
          ...jersey,
          date: jersey.date?.toDate(),
          playerName: players.find(player => player.id === jersey.playerId)?.name
        }))
        .sort((a, b) => b.date - a.date);
      this.jerseys$.next(this.jerseys);

      const jerseySummaryMap: { [playerId: string]: JerseySummary } = {};
      for (const player of players.filter(player => player.active[values.season] && !player.coach)) {
        jerseySummaryMap[player.id] = { player, last: null, amount: 0 };
      }
      for (const jersey of this.jerseys) {
        const jerseyPlayer = jerseySummaryMap[jersey.playerId];
        if (jerseyPlayer) {
          jerseyPlayer.amount += 1;
          if (jersey.date) {
            jerseyPlayer.last = new Date(Math.max(jerseyPlayer.last, jersey.date));
          }
        }
      }
      this.jerseySummary = Object.values(jerseySummaryMap).sort(
        (a, b) => a.amount - b.amount || a.last - b.last || a.player.name.localeCompare(b.player.name)
      );
      this.jerseySummary$.next(this.jerseySummary);

      this.punishments = punishments.sort((a, b) => a.name.localeCompare(b.name));
      this.punishments$.next(this.punishments);

      const playerSummaryMap: { [playerId: string]: PlayerSummary } = {};
      let pendingFees = 0;
      for (const player of players) {
        playerSummaryMap[player.id] = {
          player,
          drink: 0,
          fine: 0,
          misc: 0,
          total: 0
        };
      }

      for (const fee of fees) {
        if (playerSummaryMap[fee.playerId] && !fee.paid) {
          playerSummaryMap[fee.playerId][fee.type] += fee.value;
          playerSummaryMap[fee.playerId].total += fee.value;
          pendingFees += fee.value;
        }
      }
      this.playerSummary = Object.values(playerSummaryMap)
        .filter(s => s.total || s.player.active[values.season])
        .sort((a, b) => a.player.name.localeCompare(b.player.name));
      const paidPlayerSummaries = Object.values(playerSummaryMap).filter(s => s.total <= 0 && !s.player.paid);
      for (const paidPlayerSummary of paidPlayerSummaries) {
        this.updatePlayer(paidPlayerSummary.player.id, { paid: true });
      }
      this.playerSummary$.next(this.playerSummary);

      this.pendingFees$.next(pendingFees);

      const balance: Balance = { cash: 0, bank: 0, total: 0 };
      this.balance$.next(
        this.payments.reduce((balance, payment) => {
          balance[payment.type] += payment.value;
          balance.total += payment.value;
          return balance;
        }, balance)
      );
    });
  }

  addPlayer(name: string): Promise<DocumentReference> {
    const player: Omit<Player, 'id'> = {
      name,
      whatsAppName: name,
      active: { [this.values.season]: true },
      paid: false
    };
    return addDoc(collection(this.firestore, 'players'), player);
  }

  updatePlayer(id: string, player: Partial<Player>): void {
    updateDoc(doc(this.firestore, 'players', id), player);
  }

  addFee(fee: Fee): Promise<DocumentReference> {
    return addDoc(collection(this.firestore, 'fees'), fee);
  }

  updateFee(id: string, fee: Partial<Fee>): void {
    updateDoc(doc(this.firestore, 'fees', id), fee);
  }

  deleteFee(id: string): void {
    deleteDoc(doc(this.firestore, 'fees', id));
  }

  addPayment(payment: Payment): Promise<DocumentReference> {
    return addDoc(collection(this.firestore, 'payments'), payment);
  }

  updatePayment(id: string, payment: Partial<Payment>): void {
    updateDoc(doc(this.firestore, 'payments', id), payment);
  }

  deletePayment(id: string): void {
    deleteDoc(doc(this.firestore, 'payments', id));
  }

  addJersey(jersey: Jersey): Promise<DocumentReference> {
    return addDoc(collection(this.firestore, 'jerseys'), jersey);
  }

  updateJersey(id: string, jersey: Partial<Jersey>): void {
    updateDoc(doc(this.firestore, 'jerseys', id), jersey);
  }

  deleteJersey(id: string): void {
    deleteDoc(doc(this.firestore, 'jerseys', id));
  }

  addPunishment(punishment: Punishment): void {
    addDoc(collection(this.firestore, 'punishments'), punishment);
  }

  updatePunishment(id: string, punishment: Partial<Punishment>): void {
    updateDoc(doc(this.firestore, 'punishments', id), punishment);
  }

  deletePunishment(id: string): void {
    deleteDoc(doc(this.firestore, 'punishments', id));
  }

  updateValues(values: Partial<Values>): void {
    updateDoc(doc(this.firestore, 'values/0'), values);
  }
}
