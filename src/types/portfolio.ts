export interface CashAccount {
  id: string;
  name: string;
  balance: number;
  platform: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export type CashAccountInput = Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt'>;

export interface AssetSnapshot {
  id: string;
  date: string;
  totalAssets: number;
  investmentValue: number;
  cashValue: number;
  createdAt: string;
}
