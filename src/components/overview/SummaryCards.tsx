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
    { label: '投资市值', value: formatCurrency(summary.investmentValue), color: 'text-text-primary' },
    { label: '现金', value: formatCurrency(summary.cashValue), color: 'text-text-secondary' },
    { label: '总成本', value: formatCurrency(summary.totalCostValue), color: 'text-text-secondary' },
    { label: '总盈亏', value: formatCurrency(summary.totalPnlAmount), color: pnlColor },
    { label: '总盈亏 %', value: formatPercent(summary.totalPnlPercent), color: pnlColor },
  ];

  return (
    <section className="summary-layout" aria-label="资产概况">
      <GlassCard className="asset-hero">
        <div>
          <div className="hero-label">总资产 <span className="ml-2 text-text-muted text-xs">USD</span></div>
          <div className="hero-value">{formatCurrency(summary.totalAssets)}</div>
          <p className="hero-caption">投资与现金，尽在此刻。</p>
        </div>
        <svg className="hero-art" viewBox="0 0 164 132" fill="none" aria-hidden="true">
          <rect x="12" y="67" width="30" height="53" rx="10" fill="currentColor" opacity=".12" />
          <rect x="58" y="42" width="30" height="78" rx="10" fill="currentColor" opacity=".23" />
          <rect x="104" y="12" width="30" height="108" rx="10" fill="currentColor" opacity=".45" />
          <path d="M18 49L64 23L91 30L132 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </GlassCard>
      {cards.map((card) => (
        <GlassCard key={card.label} className="metric-card">
          <div className="metric-label">{card.label}</div>
          <div className={`metric-value ${card.color}`}>{card.value}</div>
        </GlassCard>
      ))}
    </section>
  );
}
