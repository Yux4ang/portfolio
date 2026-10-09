import { useState, type FormEvent } from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useCashStore } from '@/store/useCashStore';
import { formatCurrency, getPnlColorClass } from '@/utils/formatters';

function formatChangeTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatSignedCurrency(value: number) {
  return `${value > 0 ? '+' : ''}${formatCurrency(value)}`;
}

export function CashAccountsPanel() {
  const accounts = useCashStore((s) => s.accounts);
  const addAccount = useCashStore((s) => s.addAccount);
  const updateAccount = useCashStore((s) => s.updateAccount);
  const deleteAccount = useCashStore((s) => s.deleteAccount);
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('');
  const [balance, setBalance] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [changeNote, setChangeNote] = useState('');

  const editingAccount = accounts.find((account) => account.id === editingId) ?? null;
  const historyAccount = accounts.find((account) => account.id === historyId) ?? null;
  const parsedNewBalance = Number(newBalance);
  const balanceDelta = editingAccount && Number.isFinite(parsedNewBalance)
    ? parsedNewBalance - editingAccount.balance
    : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(balance);
    if (!name.trim() || !Number.isFinite(amount) || amount < 0) return;
    addAccount({ name: name.trim(), platform: platform.trim() || '现金账户', balance: amount });
    setName('');
    setPlatform('');
    setBalance('');
  }

  function openBalanceEditor(id: string) {
    const account = accounts.find((item) => item.id === id);
    if (!account) return;
    setEditingId(id);
    setNewBalance(String(account.balance));
    setChangeNote('');
  }

  function closeBalanceEditor() {
    setEditingId(null);
    setNewBalance('');
    setChangeNote('');
  }

  function submitBalanceChange(event: FormEvent) {
    event.preventDefault();
    if (!editingAccount || !Number.isFinite(parsedNewBalance) || parsedNewBalance < 0) return;
    if (parsedNewBalance === editingAccount.balance) return;
    updateAccount(
      editingAccount.id,
      {
        name: editingAccount.name,
        platform: editingAccount.platform,
        balance: parsedNewBalance,
        note: editingAccount.note,
      },
      changeNote
    );
    closeBalanceEditor();
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">现金账户</h2>
          <p className="text-xs text-text-muted mt-1">可调整余额并追踪每个账户的历次变化</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-text-muted">现金合计</div>
          <div className="text-xl font-semibold tabular-nums">
            {formatCurrency(accounts.reduce((sum, item) => sum + item.balance, 0))}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-5">
        {accounts.length === 0 && (
          <div className="rounded-app-sm bg-white/10 px-4 py-5 text-center text-sm text-text-muted">
            还没有现金账户，可在下方添加。
          </div>
        )}
        {accounts.map((account) => {
          const lastChange = account.balanceHistory.at(-1);
          return (
            <div
              key={account.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-app-md bg-white/10 px-4 py-3"
            >
              <div className="min-w-0">
                <div className="font-medium text-text-primary truncate">{account.name}</div>
                <div className="text-xs text-text-muted truncate">
                  {account.platform}
                  {lastChange && ` · 更新于 ${formatChangeTime(lastChange.changedAt)}`}
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3">
                <span className="font-semibold text-text-primary tabular-nums">
                  {formatCurrency(account.balance)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-app-sm text-xs text-brand-600 hover:bg-brand-500/10 transition-colors"
                    onClick={() => openBalanceEditor(account.id)}
                  >
                    调整余额
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-app-sm text-xs text-text-secondary hover:bg-white/15 transition-colors"
                    onClick={() => setHistoryId(account.id)}
                  >
                    变更记录 {account.balanceHistory.length}
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1.5 rounded-app-sm text-xs text-loss hover:bg-loss/10 transition-colors"
                    onClick={() => deleteAccount(account.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-4 border-t border-white/15">
        <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="账户名称" />
        <input className="input-field" value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="银行 / 券商" />
        <input className="input-field" type="number" min="0" step="any" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="余额 (USD)" />
        <Button type="submit">添加现金账户</Button>
      </form>

      <Modal open={editingAccount !== null} onClose={closeBalanceEditor} title="调整现金余额">
        {editingAccount && (
          <form onSubmit={submitBalanceChange}>
            <div className="rounded-app-md bg-white/20 p-4 mb-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-text-primary">{editingAccount.name}</div>
                  <div className="text-xs text-text-muted">{editingAccount.platform}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-text-muted">当前余额</div>
                  <div className="font-semibold tabular-nums">{formatCurrency(editingAccount.balance)}</div>
                </div>
              </div>
            </div>

            <label className="block text-sm text-text-secondary mb-1" htmlFor="cash-new-balance">新的余额 (USD)</label>
            <input
              id="cash-new-balance"
              className="input-field"
              type="number"
              min="0"
              step="any"
              value={newBalance}
              onChange={(event) => setNewBalance(event.target.value)}
              autoFocus
            />
            <div className="h-7 pt-1 text-xs">
              {balanceDelta !== null && Number.isFinite(balanceDelta) && (
                <span className={getPnlColorClass(balanceDelta)}>
                  本次变动 {formatSignedCurrency(balanceDelta)}
                </span>
              )}
            </div>

            <label className="block text-sm text-text-secondary mb-1" htmlFor="cash-change-note">变更备注（可选）</label>
            <input
              id="cash-change-note"
              className="input-field"
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              placeholder="例如：入金、出金、利息、手续费"
            />

            <div className="flex gap-3 mt-5">
              <Button type="button" variant="secondary" className="flex-1" onClick={closeBalanceEditor}>取消</Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  !Number.isFinite(parsedNewBalance) ||
                  parsedNewBalance < 0 ||
                  parsedNewBalance === editingAccount.balance
                }
              >
                保存新余额
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={historyAccount !== null}
        onClose={() => setHistoryId(null)}
        title={historyAccount ? `${historyAccount.name} · 余额变更` : '余额变更'}
        maxWidthClassName="max-w-2xl"
      >
        {historyAccount && (
          <div>
            <div className="flex items-end justify-between gap-4 rounded-app-md bg-white/20 p-4 mb-4">
              <div>
                <div className="text-xs text-text-muted">{historyAccount.platform}</div>
                <div className="text-sm text-text-secondary mt-1">{historyAccount.balanceHistory.length} 条记录</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-muted">当前余额</div>
                <div className="text-xl font-semibold tabular-nums">{formatCurrency(historyAccount.balance)}</div>
              </div>
            </div>

            <div className="space-y-2">
              {[...historyAccount.balanceHistory].reverse().map((change) => (
                <div key={change.id} className="rounded-app-md border border-white/20 bg-white/10 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {change.type === 'initial' ? '初始余额' : (change.note || '余额调整')}
                      </div>
                      <div className="text-xs text-text-muted mt-1">{formatChangeTime(change.changedAt)}</div>
                    </div>
                    <div className={`font-semibold tabular-nums ${getPnlColorClass(change.delta)}`}>
                      {formatSignedCurrency(change.delta)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 text-sm text-text-secondary tabular-nums">
                    <span>{formatCurrency(change.previousBalance)}</span>
                    <span className="text-text-muted">→</span>
                    <span className="font-medium text-text-primary">{formatCurrency(change.newBalance)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </GlassCard>
  );
}
