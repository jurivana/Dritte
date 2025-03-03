import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FirebaseService } from '../../services/firebase.service';
import { AuthService } from '../../services/auth.service';
import { BehaviorSubject, Observable, Subject, combineLatest, firstValueFrom, map, takeUntil } from 'rxjs';
import { Balance, Fee, FeeType, FeeTypeIcon, Payment, Player, Punishment } from '../../models/models';
import { FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';
import html2canvas from 'html2canvas-pro';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  standalone: false
})
export class AdminComponent implements OnInit, OnDestroy {
  @ViewChild('feeModal') feeModal: ElementRef<HTMLDialogElement>;
  @ViewChild('paymentModal') paymentModal: ElementRef<HTMLDialogElement>;
  @ViewChild('punishmentModal') punishmentModal: ElementRef<HTMLDialogElement>;
  @ViewChild('closingModal') closingModal: ElementRef<HTMLDialogElement>;
  @ViewChild('summaryTable') summaryTable: ElementRef<HTMLDialogElement>;

  players$: Observable<Player[]>;

  fees$: Observable<Fee[]>;
  feeLength$ = new BehaviorSubject<number>(7);
  feeFilter$ = new BehaviorSubject<FeeType | null>(null);
  canExtendFees: boolean;
  feeTypeIcon = FeeTypeIcon;
  feeForm: FormGroup;

  payments$: Observable<Payment[]>;
  paymentLength$ = new BehaviorSubject<number>(7);
  canExtendPayments: boolean;
  paymentForm: FormGroup;

  punishmentForm: FormGroup;
  closingForm: FormGroup;

  balance: Balance;

  destroyed$ = new Subject<void>();

  constructor(
    public authService: AuthService,
    public fbService: FirebaseService,
    private formBuilder: NonNullableFormBuilder
  ) {}

  ngOnInit(): void {
    this.players$ = combineLatest([this.fbService.players$, this.fbService.values$]).pipe(
      map(([players, values]) => players.filter(player => player.active[values.season]))
    );
    this.fees$ = combineLatest([this.fbService.fees$, this.feeLength$, this.feeFilter$]).pipe(
      map(([fees, feeLength, filter]) => {
        fees = fees.filter(fee => fee.season === this.fbService.values.season && (!filter || filter === fee.type));
        this.canExtendFees = feeLength < fees.length;
        return fees.slice(0, feeLength);
      })
    );
    this.payments$ = combineLatest([this.fbService.payments$, this.paymentLength$]).pipe(
      map(([payments, paymentLength]) => {
        this.canExtendPayments = paymentLength < payments.length;
        return payments.slice(0, paymentLength);
      })
    );
    this.fbService.balance$.pipe(takeUntil(this.destroyed$)).subscribe(balance => (this.balance = balance));

    const currDate = this.dateForInput(new Date());
    this.paymentForm = this.formBuilder.group({
      id: [''],
      title: ['', Validators.required],
      value: ['', [Validators.required, Validators.pattern(/-?\d+/)]],
      date: [currDate, Validators.required],
      type: ['bank', Validators.required],
      from: ['player'],
      playerId: ['']
    });

    this.feeForm = this.formBuilder.group({
      id: [''],
      playerId: ['', Validators.required],
      date: [currDate, Validators.required],
      type: ['fine', Validators.required],
      punishment: [''],
      comment: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.pattern(/\d+/)]],
      value: ['', [Validators.required, Validators.pattern(/-?\d+/)]]
    });

    this.punishmentForm = this.formBuilder.group({
      id: [''],
      name: ['', Validators.required],
      value: ['', Validators.required]
    });

    this.closingForm = this.formBuilder.group({
      date: [currDate, Validators.required],
      includeLateFee: [true, Validators.required],
      includeMonthlyFee: [true, Validators.required]
    });
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  toggleFilter(type: FeeType) {
    if (type === this.feeFilter$.value) {
      this.feeFilter$.next(null);
    } else {
      this.feeFilter$.next(type);
    }
    this.feeModal.nativeElement.focus();
    this.feeModal.nativeElement.blur();
  }

  async savePayment() {
    const { id, date, type, title, from, value, playerId } = this.paymentForm.value;
    if (!(date && type && title && value)) {
      this.resetPaymentForm();
      return;
    }

    if (id) {
      this.fbService.updatePayment(id, {
        date: new Date(date),
        title,
        type,
        value
      });
    } else {
      const paidFees: string[] = [];
      let createdFee = '';
      if (from === 'player') {
        const openFees = this.fbService.fees.filter(fee => fee.playerId === playerId && !fee.paid);

        const creditFees = openFees.filter(fee => fee.value < 0);
        let remainingValue = value;
        for (const fee of creditFees) {
          this.fbService.updateFee(fee.id!, { paid: true });
          paidFees.push(fee.id!);
          remainingValue -= fee.value;
        }

        const pendingFees = openFees.filter(fee => fee.value >= 0).sort((a, b) => a.date - b.date);
        for (const fee of pendingFees) {
          if (fee.value <= remainingValue) {
            this.fbService.updateFee(fee.id!, { paid: true });
            paidFees.push(fee.id!);
            remainingValue -= fee.value;
          }
        }

        if (remainingValue > 0) {
          const feeDocument = await this.fbService.addFee({
            playerId,
            type: 'misc',
            comment: 'Überschuss Einzahlung',
            quantity: 1,
            value: -remainingValue,
            date: new Date(date),
            season: this.fbService.values.season,
            paid: false
          });
          createdFee = feeDocument.id;
        }
        if (value > 0) {
          this.fbService.updatePlayer(playerId, { paid: true });
        }
      }

      const payment: Payment = {
        type,
        title,
        value,
        paidFees: paidFees,
        createdFee,
        date: new Date(date)
      };
      this.fbService.addPayment(payment);
    }

    this.resetPaymentForm();
  }

  async saveFee() {
    const { id, playerId, date, type, comment, quantity, value } = this.feeForm.value;
    if (!(playerId && date && type && comment && quantity && value)) {
      this.resetFeeForm();
      return;
    }

    if (id) {
      this.fbService.updateFee(id, {
        playerId,
        type,
        comment,
        quantity,
        value,
        date: new Date(date)
      });
    } else {
      const fee: Fee = {
        playerId,
        type,
        comment,
        quantity,
        value,
        date: new Date(date),
        season: this.fbService.values.season,
        paid: false
      };
      if (playerId === 'all') {
        for (const player of await firstValueFrom(this.players$)) {
          this.fbService.addFee({ ...fee, playerId: player.id });
        }
      } else {
        this.fbService.addFee(fee);
      }
    }

    this.resetFeeForm();
  }

  savePunishment() {
    const { id, name, value } = this.punishmentForm.value;
    if (id) {
      this.fbService.updatePunishment(id, { name, value });
    } else {
      this.fbService.addPunishment({ name, value });
    }
  }

  editPayment(payment: Payment): void {
    this.paymentForm.patchValue({
      ...payment,
      date: this.dateForInput(payment.date),
      from: payment.createdFee || payment.paidFees?.length ? 'player' : 'misc'
    });
    this.paymentModal.nativeElement.showModal();
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

  editPunishment(punishment: Punishment): void {
    this.punishmentForm.patchValue(punishment);
    this.punishmentModal.nativeElement.showModal();
    this.punishmentModal.nativeElement.focus();
    this.punishmentModal.nativeElement.blur();
  }

  deletePayment(): void {
    const payment = this.fbService.payments.find(p => p.id === this.paymentForm.value.id);
    if (!payment || !payment.id) {
      return;
    }
    if (payment.paidFees) {
      for (const paidFee of payment.paidFees) {
        this.fbService.updateFee(paidFee, { paid: false });
      }
    }
    if (payment.createdFee) {
      this.fbService.deleteFee(payment.createdFee);
    }

    this.fbService.deletePayment(payment.id);
    this.resetPaymentForm();
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

  deletePunishment(): void {
    if (!this.punishmentForm.value.id) {
      return;
    }
    this.fbService.deletePunishment(this.punishmentForm.value.id);
    this.resetPunishmentForm();
  }

  updateValue() {
    if (this.feeForm.value.type === 'fine') {
      const punishment = this.fbService.punishments.find(p => p.id === this.feeForm.value.punishment);
      if (punishment) {
        this.feeForm.get('value')?.setValue(this.feeForm.value.quantity * punishment.value);
      }
    }
  }

  startClosing(): void {
    const date = new Date(this.closingForm.value.date);
    const latePunishment = this.fbService.punishments.find(p => p.name === 'Zu spät bezahlt')!;
    for (const summary of this.fbService.playerSummary) {
      if (this.closingForm.value.includeLateFee && summary.total > 0 && !summary.player.paid) {
        this.fbService.addFee({
          playerId: summary.player.id,
          type: 'fine',
          comment: latePunishment.name,
          date,
          paid: false,
          quantity: 1,
          value: latePunishment.value,
          season: this.fbService.values.season
        });
      }

      if (this.closingForm.value.includeMonthlyFee && summary.player.active[this.fbService.values.season]) {
        const monthName = new Date(this.closingForm.value.date).toLocaleString('de-DE', { month: 'long' });
        this.fbService.addFee({
          playerId: summary.player.id,
          type: 'misc',
          comment: 'Monatsbeitrag ' + monthName,
          date: new Date(this.closingForm.value.date),
          paid: false,
          quantity: 1,
          value: 10,
          season: this.fbService.values.season
        });
        summary.total += 10;
      }

      this.fbService.updatePlayer(summary.player.id, { paid: summary.total <= 0 });
    }
  }

  playerChanged() {
    const player = this.fbService.players.find(p => p.id === this.paymentForm.value.playerId);
    this.paymentForm.get('title')?.setValue('Einzahlung ' + player?.name);
  }

  resetFeeForm(): void {
    this.feeForm.reset();
    this.feeModal.nativeElement.close();
  }

  resetPaymentForm(): void {
    this.paymentForm.reset();
    this.paymentModal.nativeElement.close();
  }

  resetPunishmentForm(): void {
    this.punishmentForm.reset();
    this.punishmentModal.nativeElement.close();
  }

  resetClosingForm(): void {
    this.closingForm.reset();
    this.closingModal.nativeElement.close();
  }

  increaseFeeLength(): void {
    this.feeLength$.next(this.feeLength$.value + 10);
  }

  increasePaymentLength(): void {
    this.paymentLength$.next(this.paymentLength$.value + 10);
  }

  select(event: FocusEvent): void {
    const target = event.target as HTMLInputElement;
    target.select();
  }

  importDrinks(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target?.files) {
      return;
    }
    const file = target.files[0];
    const reader = new FileReader();

    const readFile = async (text: string | undefined) => {
      if (!text) {
        return;
      }

      const oldLastDrink = this.fbService.values.lastDrink.toDate();
      let updatedLastDrink = false;
      const lines = text.split(/\r?\n/);
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        const [day, month, year] = line.slice(0, 8).split('.');
        const time = line.slice(10, 15);
        const date = new Date(`${month}/${day}/${year} ${time}`);
        if (date <= oldLastDrink) {
          return;
        }

        const [name, msg] = line.slice(18).split(':');
        if (!(name && msg)) {
          continue;
        }

        const amount = msg.match(/\d+/)?.[0];
        if (!amount || amount === '0') {
          continue;
        }

        const player = this.fbService.players.find(player => player.whatsAppName === name);
        let playerId = player?.id;
        if (!player) {
          const doc = await this.fbService.addPlayer(name);
          playerId = doc.id;
        }

        this.fbService.addFee({
          season: this.fbService.values.season,
          playerId: playerId as string,
          type: 'drink',
          date: date,
          value: +amount * this.fbService.values.drinkPrice,
          quantity: +amount,
          paid: false,
          comment: 'Getränk'
        });

        if (!updatedLastDrink) {
          this.fbService.updateValues({ lastDrink: date });
          updatedLastDrink = true;
        }
      }
    };

    if (file.type === 'text/plain') {
      reader.onload = async () => {
        readFile(reader.result?.toString());
      };
      reader.readAsText(file);
    } else {
      const zip = new JSZip();
      zip.loadAsync(file).then(zip => {
        Object.values(zip.files)[0]
          .async('string')
          .then(data => {
            readFile(data);
          });
      });
    }
  }

  async exportSummary(): Promise<void> {
    this.summaryTable.nativeElement.style.width = '700px';
    this.summaryTable.nativeElement.style.maxWidth = 'none';

    const canvas = await html2canvas(this.summaryTable.nativeElement, { backgroundColor: '#1d232a' });
    canvas.toBlob(async blob => {
      if (blob) {
        try {
          await navigator.share({
            files: [
              new File([blob], 'Mannschaftskasse Dritte.png', {
                type: blob.type
              })
            ]
          });
        } catch (e) {
          saveAs(blob, 'Mannschaftskasse Dritte.png');
        }
      }
      this.summaryTable.nativeElement.style.width = 'inherit';
      this.summaryTable.nativeElement.style.maxWidth = 'inherit';
    });
  }

  dateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
