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
    return this.dateInTimezone(date).toISOString().slice(0, 10);
  }

  dateTimeForInput(date: Date): string {
    return this.dateInTimezone(date).toISOString().slice(0, 16);
  }

  dateInTimezone(date: Date): Date {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  }
}
