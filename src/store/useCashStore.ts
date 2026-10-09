import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CashAccount, CashAccountInput } from '@/types';
import { loadCashAccounts, saveCashAccounts } from '@/services/storage/localStorage';

interface CashStore {
  accounts: CashAccount[];
  addAccount: (input: CashAccountInput) => void;
  updateAccount: (id: string, input: CashAccountInput, changeNote?: string) => void;
  deleteAccount: (id: string) => void;
}

export const useCashStore = create<CashStore>((set, get) => ({
  accounts: loadCashAccounts(),
  addAccount: (input) => {
    const now = new Date().toISOString();
    const accountId = uuidv4();
    const accounts = [...get().accounts, {
      ...input,
      id: accountId,
      createdAt: now,
      updatedAt: now,
      balanceHistory: [{
        id: uuidv4(),
        previousBalance: 0,
        newBalance: input.balance,
        delta: input.balance,
        changedAt: now,
        type: 'initial' as const,
        note: '初始余额',
      }],
    }];
    saveCashAccounts(accounts);
    set({ accounts });
  },
  updateAccount: (id, input, changeNote) => {
    const now = new Date().toISOString();
    const accounts = get().accounts.map((account) => {
      if (account.id !== id) return account;
      const balanceChanged = account.balance !== input.balance;
      return {
        ...account,
        ...input,
        updatedAt: now,
        balanceHistory: balanceChanged
          ? [...account.balanceHistory, {
              id: uuidv4(),
              previousBalance: account.balance,
              newBalance: input.balance,
              delta: input.balance - account.balance,
              changedAt: now,
              type: 'adjustment' as const,
              note: changeNote?.trim() || undefined,
            }]
          : account.balanceHistory,
      };
    });
    saveCashAccounts(accounts);
    set({ accounts });
  },
  deleteAccount: (id) => {
    const accounts = get().accounts.filter((account) => account.id !== id);
    saveCashAccounts(accounts);
    set({ accounts });
  },
}));
