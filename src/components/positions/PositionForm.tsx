/**
 * 仓位录入/编辑表单。
 * 新增和编辑复用同一个表单组件：传入 initialValue 就是编辑模式，
 * 不传就是新增模式。
 */
import { useState, type FormEvent } from 'react';
import type { PositionInput, AssetType, Position } from '@/types';
import { SUGGESTED_PLATFORMS } from '@/config/platforms';
import { Button } from '@/components/common/Button';
import { useCashStore } from '@/store/useCashStore';
import { getPlatformCashAccounts, purchaseBalance } from '@/services/storage/positionPurchase';
import { formatCurrency } from '@/utils/formatters';

interface PositionFormProps {
  initialValue?: Position;
  onSubmit: (input: PositionInput, cashAccountId?: string, actualBalance?: number) => void;
  onCancel: () => void;
}

export function PositionForm({ initialValue, onSubmit, onCancel }: PositionFormProps) {
  const [symbol, setSymbol] = useState(initialValue?.symbol ?? '');
  const [assetType, setAssetType] = useState<AssetType>(initialValue?.assetType ?? 'stock');
  const [costPrice, setCostPrice] = useState(initialValue?.costPrice?.toString() ?? '');
  const [quantity, setQuantity] = useState(initialValue?.quantity?.toString() ?? '');
  const [platform, setPlatform] = useState(initialValue?.platform ?? '');
  const [note, setNote] = useState(initialValue?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [purchasedAt, setPurchasedAt] = useState(initialValue?.purchasedAt ?? '');
  const accounts = useCashStore(s => s.accounts);
  const [deductCash, setDeductCash] = useState(true);
  const [cashAccountId, setCashAccountId] = useState('');
  const [actualBalance, setActualBalance] = useState('');
  const balanceOverride = actualBalance.trim() === '' ? undefined : Number(actualBalance);
  const matchingAccounts = getPlatformCashAccounts(accounts, platform);
  const selectedAccountId = cashAccountId || (matchingAccounts.length === 1 ? matchingAccounts[0].id : '');
  const selectedAccount = matchingAccounts.find(account => account.id === selectedAccountId);
  const shouldDeductCash = !initialValue && deductCash && matchingAccounts.length > 0;
  const purchaseAmount = costPrice.trim() && quantity.trim() && Number(costPrice) >= 0 && Number(quantity) > 0
    ? Number(costPrice) * Number(quantity) : NaN;
  let remainingBalance: number | null = null;
  let balanceError: string | null = null;
  if (shouldDeductCash && selectedAccount && Number.isFinite(purchaseAmount)) {
    try { remainingBalance = purchaseBalance(selectedAccount.balance, purchaseAmount, balanceOverride); }
    catch (error) { balanceError = error instanceof Error ? error.message : '无法计算现金余额'; }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedSymbol = symbol.trim();
    const parsedCost = parseFloat(costPrice);
    const parsedQty = parseFloat(quantity);
    const trimmedPlatform = platform.trim();

    if (!trimmedSymbol) {
      setError('请输入代码（Symbol）');
      return;
    }
    if (!Number.isFinite(parsedCost) || parsedCost < 0) {
      setError('购入价格必须是有效的非负数');
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      setError('购入数量必须是大于 0 的数字');
      return;
    }
    if (!trimmedPlatform) {
      setError('请输入购入平台');
      return;
    }

    if (shouldDeductCash && !selectedAccount) {
      setError('请选择当前平台的扣款现金账户');
      return;
    }
    if (balanceError) { setError(balanceError); return; }

    try {
      onSubmit({
        symbol: trimmedSymbol,
        assetType,
        costPrice: parsedCost,
        quantity: parsedQty,
        platform: trimmedPlatform,
        purchasedAt: purchasedAt || undefined,
        note: note.trim() || undefined,
      }, shouldDeductCash ? selectedAccountId : undefined, shouldDeductCash ? balanceOverride : undefined);
    } catch (error) {
      setError(error instanceof Error ? error.message : '保存失败，请重试。');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 资产类型切换 */}
      <div>
        <label className="block text-sm text-text-secondary mb-1.5">资产类型</label>
        <div className="flex gap-2">
          {(['stock', 'crypto'] as AssetType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setAssetType(type)}
              className={`flex-1 py-2 rounded-app-sm text-sm font-medium transition-colors ${
                assetType === type
                  ? 'bg-brand-500 text-white'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
              }`}
            >
              {type === 'stock' ? '美股' : '加密货币'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1.5">
          代码（Symbol）
        </label>
        <input
          type="text"
          className="input-field"
          placeholder={assetType === 'stock' ? '例如 AAPL' : '例如 BTC'}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">购入价格 (USD)</label>
          <input
            type="number"
            step="any"
            className="input-field"
            placeholder="0.00"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-text-secondary mb-1.5">购入数量</label>
          <input
            type="number"
            step="any"
            className="input-field"
            placeholder="0.00"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-1.5">购入平台</label>
        <input
          type="text"
          className="input-field"
          placeholder="例如 IBKR / Binance"
          value={platform}
          onChange={(e) => { setPlatform(e.target.value); setCashAccountId(''); setActualBalance(''); setError(null); }}
          list="platform-suggestions"
        />
        <datalist id="platform-suggestions">
          {[...new Set([...SUGGESTED_PLATFORMS, ...accounts.map(account => account.platform)])].map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

      {!initialValue && (
        <section className="rounded-app-md border border-surface-border bg-surface-secondary p-4 space-y-3" aria-label="购入现金扣款">
          <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={deductCash && matchingAccounts.length > 0}
              disabled={matchingAccounts.length === 0} onChange={event => { setDeductCash(event.target.checked); setError(null); }} />
            从同平台现金账户扣款
          </label>
          {matchingAccounts.length === 0 ? (
            <p className="text-xs text-text-muted">{platform.trim() ? '此平台还没有现金账户。可先在总览添加；本次将仅录入仓位。' : '填写购入平台后，将匹配该平台的现金账户。'}</p>
          ) : shouldDeductCash ? (
            <>
              <label className="block text-xs text-text-secondary" htmlFor="purchase-cash-account">扣款账户</label>
              <select id="purchase-cash-account" className="input-field" value={selectedAccountId}
                onChange={event => { setCashAccountId(event.target.value); setActualBalance(''); setError(null); }}>
                <option value="" disabled>请选择现金账户</option>
                {matchingAccounts.map(account => <option key={account.id} value={account.id}>{account.name} · {formatCurrency(account.balance)}</option>)}
              </select>
              <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">购入金额（不含手续费）</span><span className="font-medium tabular-nums">{Number.isFinite(purchaseAmount) ? formatCurrency(purchaseAmount) : '—'}</span></div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5" htmlFor="purchase-actual-balance">购买后实际余额 (USD，可选)</label>
                <input id="purchase-actual-balance" type="number" min="0" step="any" className="input-field" value={actualBalance}
                  placeholder={selectedAccount && Number.isFinite(purchaseAmount) && selectedAccount.balance >= purchaseAmount ? `默认 ${formatCurrency(selectedAccount.balance - purchaseAmount)}` : '填写平台显示的真实余额'}
                  onChange={event => { setActualBalance(event.target.value); setError(null); }} />
                <p className="text-xs text-text-muted mt-2">留空按购入金额自动扣款；填写后以实际余额为准，可计入手续费等差额。</p>
              </div>
              {selectedAccount && <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">账户余额</span><span className="tabular-nums">{formatCurrency(selectedAccount.balance)} → {remainingBalance !== null ? formatCurrency(remainingBalance) : '—'}</span></div>}
              {selectedAccount && remainingBalance !== null && balanceOverride !== undefined && <div className="flex justify-between gap-3 text-sm"><span className="text-text-secondary">实际现金变动</span><span className="font-medium tabular-nums">{remainingBalance > selectedAccount.balance ? '+' : ''}{formatCurrency(remainingBalance - selectedAccount.balance)}</span></div>}
              {balanceError && <p role="status" className="text-xs text-loss">{balanceError}</p>}
              <p className="text-xs text-text-muted">保存时同步记录现金余额变更及修正备注。</p>
            </>
          ) : <p className="text-xs text-text-muted">本次仅录入仓位，现金余额保持不变。</p>}
        </section>
      )}

      <div>
  <label className="block text-sm text-text-secondary mb-1.5">
    购入日期（可选）
  </label>
  <input
    type="date"
    className="input-field"
    value={purchasedAt}
    onChange={(e) => setPurchasedAt(e.target.value)}
  />
  <p className="text-xs text-text-muted mt-1">
    不填的话，平仓时会用系统记录的建仓时间来计算持仓天数
  </p>
</div>

       <div>
        <label className="block text-sm text-text-secondary mb-1.5">备注（可选）</label>
        <input
          type="text"
          className="input-field"
          placeholder="任意备注信息"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p role="alert" className="text-sm text-loss">{error}</p>}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          {initialValue ? '保存修改' : '添加仓位'}
        </Button>
      </div>
    </form>
  );
}
