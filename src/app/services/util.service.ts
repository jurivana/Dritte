import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {
  constructor() {}

  select(event: FocusEvent): void {
    const target = event.target as HTMLInputElement;
    target.select();
  }

  dateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
