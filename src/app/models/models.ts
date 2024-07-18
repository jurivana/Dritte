export type Values = {
  balance: number;
  cash: number;
  season: string;
  lastDrink: any;
  drinkPrice: number;
};

export type Player = {
  id: string;
  name: string;
  whatsAppName: string;
  active: { [season: string]: boolean };
};

export type FeeType = 'fine' | 'drink' | 'misc';
export enum FeeTypeIcon {
  fine = 'fas fa-gavel',
  drink = 'fas fa-glass-water',
  misc = 'fas fa-coins'
}

export type Fee = {
  id?: string;
  season: string;
  playerId: string;
  type: FeeType;
  value: number;
  date: any;
  paid: boolean;
  comment: string;
  quantity: number;
  playerName?: string;
};

export type PaymentType = 'cash' | 'bank';
export type Payment = {
  id?: string;
  title: string;
  value: number;
  date: any;
  type: PaymentType;
  paidFees?: string[];
  createdFee?: string;
};

export type Punishment = {
  id?: string;
  name: string;
  value: number;
};

export type PlayerSummary = {
  playerId: string;
  player: string;
  drink: number;
  fine: number;
  misc: number;
  total: number;
};

export type Balance = {
  cash: number;
  bank: number;
  total: number;
};
