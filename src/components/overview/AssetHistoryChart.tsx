import { useId, useMemo, useState, type FormEvent } from 'react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { useAssetHistoryStore } from '@/store/useAssetHistoryStore';
import { formatCurrency, getLocalDateKey } from '@/utils/formatters';

interface Props {
  current: { totalAssets: number; investmentValue: number; cashValue: number };
}

export function AssetHistoryChart({ current }: Props) {
  const gradientId = useId();
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
          <p className="text-xs text-text-muted mt-1">记录时间，看见积累。</p>
        </div>
        <div className={change >= 0 ? 'text-gain' : 'text-loss'}>{change >= 0 ? '+' : ''}{formatCurrency(change)}</div>
      </div>

      {snapshots.length ? (
        <div>
          <div className="chart-plot">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible" role="img" aria-label={`总资产历史走势图，${snapshots.length} 个快照，期间变动 ${formatCurrency(change)}`}>
              <defs><linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0071e3" stopOpacity=".14" /><stop offset="100%" stopColor="#0071e3" stopOpacity="0" /></linearGradient></defs>
              {snapshots.length > 1 ? <>
                <polygon points={`0,100 ${points} 100,100`} fill={`url(#${gradientId})`} />
                <polyline points={points} fill="none" stroke="#0071e3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </> : <svg x="47" y="85" width="6" height="6" viewBox="0 0 12 12" preserveAspectRatio="xMidYMid meet"><circle cx="6" cy="6" r="4" fill="#0071e3" /></svg>}
            </svg>
          </div>
          <div className="flex justify-between text-xs text-text-muted mb-4">
            <span>{snapshots[0].date} · {formatCurrency(snapshots[0].totalAssets)}</span>
            <span>{snapshots[snapshots.length - 1].date} · {formatCurrency(snapshots[snapshots.length - 1].totalAssets)}</span>
          </div>
          <details className="snapshot-details">
            <summary>快照记录 · {snapshots.length} 条</summary>
          <div className="max-h-28 overflow-auto space-y-1 mb-4">
            {[...snapshots].reverse().map((item) => (
              <div key={item.id} className="flex justify-between text-xs px-2 py-1 rounded bg-white/5">
                <span>{item.date}</span><span>{formatCurrency(item.totalAssets)} <button className="text-loss ml-2" aria-label={`删除 ${item.date} 的快照`} onClick={() => deleteSnapshot(item.id)}>删除</button></span>
              </div>
            ))}
          </div>
          </details>
        </div>
      ) : <div className="chart-empty"><svg width="60" height="38" viewBox="0 0 60 38" fill="none" aria-hidden="true"><path d="M3 32L18 22L30 27L43 12L57 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M1 37H59" stroke="#e8e8ed" /></svg><p className="text-sm">你的资产旅程，从这里开始</p><p className="text-xs mt-2">记录第一个快照，逐步看见资产走势</p></div>}

      <form onSubmit={submit} className="grid grid-cols-1 xl:grid-cols-3 gap-2 mt-5">
        <input className="input-field" aria-label="快照日期" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input-field" aria-label="快照总资产，留空使用当前总资产" type="number" min="0" step="any" value={value} onChange={(e) => setValue(e.target.value)} placeholder={`当前 ${formatCurrency(current.totalAssets)}`} />
        <Button type="submit">记录资产快照</Button>
      </form>
      <p className="text-xs text-text-muted mt-3">金额留空使用当前资产；同一天再次记录会更新快照。</p>
    </GlassCard>
  );
}
