import { useState, type FormEvent } from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { useCashStore } from '@/store/useCashStore';
import { formatCurrency } from '@/utils/formatters';

export function CashAccountsPanel() {
  const accounts = useCashStore((s) => s.accounts);
  const addAccount = useCashStore((s) => s.addAccount);
  const deleteAccount = useCashStore((s) => s.deleteAccount);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [balance, setBalance] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(balance);
    if (!name.trim() || !Number.isFinite(amount) || amount < 0) return;
    addAccount({ name: name.trim(), platform: platform.trim() || '现金账户', balance: amount });
    setName('');
    setPlatform('');
    setBalance('');
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">现金账户</h2>
          <p className="text-xs text-text-muted mt-1">现金不计作仓位，也不参与投资盈亏计算</p>
        </div>
        <span className="text-xl font-semibold">
          {formatCurrency(accounts.reduce((sum, item) => sum + item.balance, 0))}
        </span>
      </div>

      <div className="space-y-2 mb-4">
        {accounts.map((account) => (
          <div key={account.id} className="flex items-center justify-between rounded-app-sm bg-white/10 px-3 py-2">
            <div>
              <div className="font-medium">{account.name}</div>
              <div className="text-xs text-text-muted">{account.platform}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{formatCurrency(account.balance)}</span>
              <button className="text-xs text-loss" onClick={() => deleteAccount(account.id)}>删除</button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="账户名称" />
        <input className="input-field" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="银行 / 券商" />
        <input className="input-field" type="number" min="0" step="any" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="余额 (USD)" />
        <Button type="submit">添加现金账户</Button>
      </form>
    </GlassCard>
  );
}
