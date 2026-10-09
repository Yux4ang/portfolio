export interface CashBalanceChange {
  id: string;
  /** 变更前余额 */
  previousBalance: number;
  /** 变更后余额 */
  newBalance: number;
  /** 本次变动 = newBalance - previousBalance */
  delta: number;
  /** ISO 时间，用于追溯和排序 */
  changedAt: string;
  /** 初始录入或后续调整 */
  type: 'initial' | 'adjustment';
  note?: string;
}

export interface CashAccount {
  id: string;
  name: string;
  balance: number;
  platform: string;
  note?: string;
  balanceHistory: CashBalanceChange[];
  createdAt: string;
  updatedAt: string;
}

export type CashAccountInput = Omit<CashAccount, 'id' | 'createdAt' | 'updatedAt' | 'balanceHistory'>;

export interface AssetSnapshot {
  id: string;
  date: string;
  totalAssets: number;
  investmentValue: number;
  cashValue: number;
  createdAt: string;
}
