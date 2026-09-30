/**
 * 资产配置分布：展示股票 vs 加密货币的市值占比，用简单的横向条形图呈现，
 * 不引入额外图表库，保持轻量。
 */
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
  const stockPct = total > 0 ? (stock.totalMarketValue / total) * 100 : 0;
  const cryptoPct = total > 0 ? (crypto.totalMarketValue / total) * 100 : 0;
  const cashPct = total > 0 ? (cashValue / total) * 100 : 0;

  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold text-text-primary mb-4">资产配置</h2>

      <div className="h-3 rounded-full overflow-hidden flex bg-white/5 mb-4">
        <div className="h-full bg-brand-500" style={{ width: `${stockPct}%` }} />
        <div className="h-full bg-gain" style={{ width: `${cryptoPct}%` }} />
        <div className="h-full bg-warn" style={{ width: `${cashPct}%` }} />
      </div>

      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
          <span className="text-text-secondary">美股</span>
          <span className="text-text-primary font-medium">{formatCurrency(stock.totalMarketValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-warn" />
          <span className="text-text-secondary">现金</span>
          <span className="text-text-primary font-medium">{formatCurrency(cashValue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-gain" />
          <span className="text-text-secondary">加密货币</span>
          <span className="text-text-primary font-medium">{formatCurrency(crypto.totalMarketValue)}</span>
        </div>
      </div>
    </GlassCard>
  );
}
