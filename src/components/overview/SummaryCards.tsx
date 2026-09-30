/**
 * 总览页面顶部的统计卡片组：总市值、总盈亏、总盈亏%、持仓数。
 */
import type { PortfolioSummary } from '@/utils/calculations';
import { GlassCard } from '@/components/common/GlassCard';
import { formatCurrency, formatPercent, getPnlColorClass } from '@/utils/formatters';

interface SummaryCardsProps {
  summary: PortfolioSummary & { totalAssets: number; investmentValue: number; cashValue: number };
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const pnlColor = getPnlColorClass(summary.totalPnlAmount);

  const cards = [
    { label: '总资产', value: formatCurrency(summary.totalAssets), color: 'text-text-primary' },
    { label: '投资市值', value: formatCurrency(summary.investmentValue), color: 'text-text-primary' },
    { label: '现金', value: formatCurrency(summary.cashValue), color: 'text-text-secondary' },
    { label: '总成本', value: formatCurrency(summary.totalCostValue), color: 'text-text-secondary' },
    { label: '总盈亏', value: formatCurrency(summary.totalPnlAmount), color: pnlColor },
    { label: '总盈亏 %', value: formatPercent(summary.totalPnlPercent), color: pnlColor },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <GlassCard key={card.label} className="p-5">
          <div className="text-xs text-text-muted mb-1.5">{card.label}</div>
          <div className={`text-2xl font-semibold ${card.color}`}>{card.value}</div>
        </GlassCard>
      ))}
    </div>
  );
}
