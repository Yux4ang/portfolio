import { v4 as uuidv4 } from 'uuid';
import type { CashAccount, Position, PositionInput } from '@/types';
import { APP_CONFIG } from '@/config/app';
import { useCashStore } from '@/store/useCashStore';
import { usePositionStore } from '@/store/usePositionStore';

export function getPlatformCashAccounts(accounts: CashAccount[], platform: string): CashAccount[] {
  const normalized = platform.trim().toLowerCase();
  return normalized ? accounts.filter(account => account.platform.trim().toLowerCase() === normalized) : [];
}

export function purchaseBalance(balance: number, amount: number, actualBalance?: number): number {
  if (!Number.isFinite(balance) || balance < 0 || !Number.isFinite(amount) || amount < 0) {
    throw new Error('余额或购入金额无效，请检查输入。');
  }
  if (actualBalance !== undefined) {
    if (!Number.isFinite(actualBalance) || actualBalance < 0) throw new Error('购买后实际余额必须是有效的非负数。');
    return actualBalance;
  }
  const remaining = balance - amount;
  const tolerance = Math.max(1, balance, amount) * Number.EPSILON * 8;
  if (remaining < -tolerance) throw new Error('现金余额不足，请调整购入金额、更换账户，或取消扣减现金。');
  return Math.max(0, remaining);
}

/** Persist both lists before publishing either store change; restore prior storage on write failure. */
export function addPositionWithCash(input: PositionInput, cashAccountId?: string, actualBalance?: number): void {
  const amount = input.costPrice * input.quantity;
  if (!input.symbol.trim() || !input.platform.trim() || !Number.isFinite(input.costPrice) || input.costPrice < 0 ||
      !Number.isFinite(input.quantity) || input.quantity <= 0 || !Number.isFinite(amount)) {
    throw new Error('请填写有效的代码、平台、价格和数量。');
  }
  const now = new Date().toISOString();
  const position: Position = {
    ...input, symbol: input.symbol.trim().toUpperCase(), platform: input.platform.trim(),
    id: uuidv4(), createdAt: now, updatedAt: now,
  };
  const positions = [...usePositionStore.getState().positions, position];
  const accounts = useCashStore.getState().accounts;
  let updatedAccounts = accounts;

  if (cashAccountId) {
    const account = getPlatformCashAccounts(accounts, input.platform).find(item => item.id === cashAccountId);
    if (!account) throw new Error('所选现金账户已不存在或不属于当前平台，请重新选择。');
    const balance = purchaseBalance(account.balance, amount, actualBalance);
    const correctionNote = actualBalance !== undefined
      ? ` · 购买后实际余额 ${balance} USD · 实际扣款 ${account.balance - balance} USD · 较理论余额修正 ${balance - (account.balance - amount)} USD`
      : '';
    updatedAccounts = accounts.map(item => item.id !== account.id ? item : {
      ...item, balance, updatedAt: now,
      balanceHistory: balance === item.balance ? item.balanceHistory : [...item.balanceHistory, {
        id: uuidv4(), previousBalance: item.balance, newBalance: balance,
        delta: balance - item.balance, changedAt: now, type: 'adjustment' as const,
        note: `买入 ${position.symbol} · ${input.quantity} × ${input.costPrice} USD${correctionNote}`,
      }],
    });
  }

  const writes: Array<[string, string]> = [[APP_CONFIG.storageKey, JSON.stringify(positions)]];
  if (cashAccountId) writes.push([APP_CONFIG.cashAccountsStorageKey, JSON.stringify(updatedAccounts)]);
  const previous = writes.map(([key]) => [key, localStorage.getItem(key)] as const);
  const written: number[] = [];
  try {
    writes.forEach(([key, value], index) => { localStorage.setItem(key, value); written.push(index); });
  } catch {
    let rollbackFailed = false;
    for (const index of written.reverse()) {
      const [key, value] = previous[index];
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch { rollbackFailed = true; }
    }
    throw new Error(rollbackFailed
      ? '保存失败，部分本地数据未能恢复。请先下载完整备份并检查仓位与余额，勿重复提交。'
      : '保存失败，仓位和现金未变更。请检查浏览器存储空间后重试。');
  }
  usePositionStore.setState({ positions });
  if (cashAccountId) useCashStore.setState({ accounts: updatedAccounts });
}
