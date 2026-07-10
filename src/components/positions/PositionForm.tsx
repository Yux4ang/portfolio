/**
 * 仓位录入/编辑表单。
 * 新增和编辑复用同一个表单组件：传入 initialValue 就是编辑模式，
 * 不传就是新增模式。
 */
import { useState, type FormEvent } from 'react';
import type { PositionInput, AssetType, Position } from '@/types';
import { SUGGESTED_PLATFORMS } from '@/config/platforms';
import { Button } from '@/components/common/Button';

interface PositionFormProps {
  initialValue?: Position;
  onSubmit: (input: PositionInput) => void;
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
    if (Number.isNaN(parsedCost) || parsedCost < 0) {
      setError('购入价格必须是有效的非负数');
      return;
    }
    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      setError('购入数量必须是大于 0 的数字');
      return;
    }
    if (!trimmedPlatform) {
      setError('请输入购入平台');
      return;
    }

    onSubmit({
  symbol: trimmedSymbol,
  assetType,
  costPrice: parsedCost,
  quantity: parsedQty,
  platform: trimmedPlatform,
  purchasedAt: purchasedAt || undefined,
  note: note.trim() || undefined,
});
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
          onChange={(e) => setPlatform(e.target.value)}
          list="platform-suggestions"
        />
        <datalist id="platform-suggestions">
          {SUGGESTED_PLATFORMS.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>

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

      {error && <p className="text-sm text-loss">{error}</p>}

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
