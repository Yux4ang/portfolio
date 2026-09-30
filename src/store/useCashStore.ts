import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { CashAccount, CashAccountInput } from '@/types';
import { loadCashAccounts, saveCashAccounts } from '@/services/storage/localStorage';

interface CashStore {
  accounts: CashAccount[];
  addAccount: (input: CashAccountInput) => void;
  updateAccount: (id: string, input: CashAccountInput) => void;
  deleteAccount: (id: string) => void;
}

export const useCashStore = create<CashStore>((set, get) => ({
  accounts: loadCashAccounts(),
  addAccount: (input) => {
    const now = new Date().toISOString();
    const accounts = [...get().accounts, { ...input, id: uuidv4(), createdAt: now, updatedAt: now }];
    saveCashAccounts(accounts);
    set({ accounts });
  },
  updateAccount: (id, input) => {
    const accounts = get().accounts.map((account) =>
      account.id === id ? { ...account, ...input, updatedAt: new Date().toISOString() } : account
    );
    saveCashAccounts(accounts);
    set({ accounts });
  },
  deleteAccount: (id) => {
    const accounts = get().accounts.filter((account) => account.id !== id);
    saveCashAccounts(accounts);
    set({ accounts });
  },
}));
