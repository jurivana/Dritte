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
  ngOnInit(): void {
    throw new Error('Method not implemented.');
  }
  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }
}
