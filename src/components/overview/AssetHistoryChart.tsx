import { useMemo, useState, type FormEvent } from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { useAssetHistoryStore } from '@/store/useAssetHistoryStore';
import { formatCurrency, getLocalDateKey } from '@/utils/formatters';

interface Props {
  current: { totalAssets: number; investmentValue: number; cashValue: number };
}

export function AssetHistoryChart({ current }: Props) {
  const snapshots = useAssetHistoryStore((s) => s.snapshots);
  const upsertSnapshot = useAssetHistoryStore((s) => s.upsertSnapshot);
  const deleteSnapshot = useAssetHistoryStore((s) => s.deleteSnapshot);
  const [date, setDate] = useState(() => getLocalDateKey());
  const [value, setValue] = useState('');

  const points = useMemo(() => {
    if (!snapshots.length) return '';
    const values = snapshots.map((item) => item.totalAssets);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return snapshots.map((item, index) => {
      const x = snapshots.length === 1 ? 50 : (index / (snapshots.length - 1)) * 100;
      const y = 88 - ((item.totalAssets - min) / range) * 76;
      return `${x},${y}`;
    }).join(' ');
  }, [snapshots]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const totalAssets = value === '' ? current.totalAssets : Number(value);
    if (!date || !Number.isFinite(totalAssets) || totalAssets < 0) return;
    const ratio = current.totalAssets > 0 ? totalAssets / current.totalAssets : 0;
    upsertSnapshot({
      date,
      totalAssets,
      investmentValue: value === '' ? current.investmentValue : current.investmentValue * ratio,
      cashValue: value === '' ? current.cashValue : current.cashValue * ratio,
    });
    setValue('');
  }

  const change = snapshots.length > 1
    ? snapshots[snapshots.length - 1].totalAssets - snapshots[0].totalAssets
    : 0;

  return (
    <GlassCard className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">资产走势</h2>
          <p className="text-xs text-text-muted mt-1">每个日期保留一个快照；再次记录同一天会更新该日数据</p>
        </div>
        <div className={change >= 0 ? 'text-gain' : 'text-loss'}>{change >= 0 ? '+' : ''}{formatCurrency(change)}</div>
      </div>

      {snapshots.length ? (
        <div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-52 overflow-visible" aria-label="总资产历史走势图">
            <line x1="0" y1="88" x2="100" y2="88" stroke="rgba(30,25,40,.12)" strokeWidth=".5" />
            <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div className="flex justify-between text-xs text-text-muted mb-4">
            <span>{snapshots[0].date} · {formatCurrency(snapshots[0].totalAssets)}</span>
            <span>{snapshots[snapshots.length - 1].date} · {formatCurrency(snapshots[snapshots.length - 1].totalAssets)}</span>
          </div>
          <div className="max-h-28 overflow-auto space-y-1 mb-4">
            {[...snapshots].reverse().map((item) => (
              <div key={item.id} className="flex justify-between text-xs px-2 py-1 rounded bg-white/5">
                <span>{item.date}</span><span>{formatCurrency(item.totalAssets)} <button className="text-loss ml-2" onClick={() => deleteSnapshot(item.id)}>删除</button></span>
              </div>
            ))}
          </div>
        </div>
      ) : <div className="h-32 grid place-items-center text-sm text-text-muted">记录第一个快照后，这里会显示资产走势</div>}

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input className="input-field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input-field" type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder={`留空使用当前 ${formatCurrency(current.totalAssets)}`} />
        <Button type="submit">记录资产快照</Button>
      </form>
    </GlassCard>
  );
}
