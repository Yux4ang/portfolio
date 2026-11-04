import { GlassCard } from '@/components/common/GlassCard';
import { formatCurrency } from '@/utils/formatters';

interface AssetAllocationBarProps {
  assetTypeSummary: {
    stock: { totalMarketValue: number };
    crypto: { totalMarketValue: number };
  };
  cashValue: number;
}

export function AssetAllocationBar({ assetTypeSummary, cashValue }: AssetAllocationBarProps) {
  const { stock, crypto } = assetTypeSummary;
  const total = stock.totalMarketValue + crypto.totalMarketValue + cashValue;
  const items = [
    { label: '美股', value: stock.totalMarketValue, color: '#0071e3' },
    { label: '加密货币', value: crypto.totalMarketValue, color: '#7894be' },
    { label: '现金', value: cashValue, color: '#c9d7e8' },
  ];
  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold">资产配置</h2>
      <p className="text-xs text-text-muted mt-1">每一部分，各有位置。</p>
      <div className="allocation-track" role="img" aria-label={total > 0 ? items.map(item => `${item.label} ${(item.value / total * 100).toFixed(1)}%`).join('，') : '暂无资产配置数据'}>
        {items.map(item => <div key={item.label} style={{ width: `${total > 0 ? item.value / total * 100 : 0}%`, background: item.color }} />)}
      </div>
      {items.map(item => (
        <div className="allocation-row" key={item.label}>
          <div className="flex items-center gap-3"><span className="allocation-dot" style={{ background: item.color }} /><span>{item.label}</span></div>
          <div className="allocation-value">{formatCurrency(item.value)}<div className="allocation-percent">{total > 0 ? (item.value / total * 100).toFixed(1) : '0.0'}%</div></div>
        </div>
      ))}
    </GlassCard>
  );
}
