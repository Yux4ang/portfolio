/**
 * 多平台汇总展示：以卡片列表形式展示每个平台的市值/盈亏，
 * 满足"总览页面能同时展示多个平台的所有持仓汇总情况"这一需求。
 */
import type { PlatformSummary } from '@/utils/calculations';
import { GlassCard } from '@/components/common/GlassCard';
import { formatCurrency, formatPercent, getPnlColorClass } from '@/utils/formatters';

interface PlatformBreakdownProps {
  platformSummaries: PlatformSummary[];
}

export function PlatformBreakdown({ platformSummaries }: PlatformBreakdownProps) {
  if (platformSummaries.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-4">平台汇总</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platformSummaries.map((ps) => (
          <GlassCard key={ps.platform} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-text-primary">{ps.platform}</span>
              <span className="text-xs text-text-muted">{ps.positionCount} 个仓位</span>
            </div>
            <div className="text-xl font-semibold text-text-primary mb-1">
              {formatCurrency(ps.totalMarketValue)}
            </div>
            <div className={`text-sm ${getPnlColorClass(ps.totalPnlAmount)}`}>
              {formatCurrency(ps.totalPnlAmount)} ({formatPercent(ps.totalPnlPercent)})
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
