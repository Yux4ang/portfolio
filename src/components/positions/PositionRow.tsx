/**
 * 单条仓位展示行。展示 symbol+logo、市值、盈亏、占比，并提供编辑/删除入口。
 */
import type { EnrichedPosition } from '@/types';
import { AssetIcon } from '@/components/common/AssetIcon';
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  getPnlColorClass,
} from '@/utils/formatters';

interface PositionRowProps {
  position: EnrichedPosition;
  onEdit: (position: EnrichedPosition) => void;
  onDelete: (position: EnrichedPosition) => void;
  onClosePosition: (position: EnrichedPosition) => void;
}
export function PositionRow({ position, onEdit, onDelete, onClosePosition }: PositionRowProps) {
  const pnlColor = getPnlColorClass(position.pnlAmount);

  return (
    <div className="position-row glass-panel glass-panel-hover p-4 flex items-center gap-4">
      {/* Symbol + Logo */}
      <AssetIcon symbol={position.symbol} assetType={position.assetType} size={40} />

      <div className="min-w-0 flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
        {/* 代码 & 平台 & 数量 */}
        <div className="min-w-0">
          <div className="font-semibold text-text-primary truncate">{position.symbol}</div>
          <div className="text-xs text-text-muted truncate">
            {position.platform} · {formatQuantity(position.quantity)}
          </div>
        </div>

        {/* 市值 */}
        <div className="hidden md:block">
          <div className="text-xs text-text-muted mb-0.5">市值</div>
          <div className="text-text-primary font-medium">
            {position.priceStatus === 'loading' ? (
              <span className="text-text-muted">加载中...</span>
            ) : (
              formatCurrency(position.marketValue)
            )}
          </div>
        </div>

        {/* 盈亏 */}
        <div className="hidden md:block">
          <div className="text-xs text-text-muted mb-0.5">盈亏</div>
          <div className={`font-medium ${pnlColor}`}>
            {formatCurrency(position.pnlAmount)}
          </div>
        </div>

        {/* 盈亏百分比 */}
        <div className="text-right md:text-left">
          <div className="text-xs text-text-muted mb-0.5 hidden md:block">盈亏 %</div>
          <div className={`font-medium ${pnlColor}`}>{formatPercent(position.pnlPercent)}</div>
        </div>

        {/* 占总资产比例 */}
        <div className="hidden md:block">
          <div className="text-xs text-text-muted mb-0.5">占总资产</div>
          <div className="text-text-secondary">{formatPercent(position.percentOfTotal, false)}</div>
        </div>
      </div>

        {/* 操作按钮 */}
<div className="position-actions flex gap-1 shrink-0">
  <button
    onClick={() => onClosePosition(position)}
    className="p-2 rounded-app-sm text-text-secondary hover:text-brand-500 hover:bg-brand-500/10 transition-colors"
    aria-label="平仓"
    title="平仓（记录为已了结）"
  >
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6" strokeLinejoin="round" /></svg>
  </button>
  <button
    onClick={() => onEdit(position)}
    className="p-2 rounded-app-sm text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
    aria-label="编辑"
    title="编辑"
  >
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z" strokeLinejoin="round" /></svg>
  </button>
  <button
    onClick={() => onDelete(position)}
    className="p-2 rounded-app-sm text-text-secondary hover:text-loss hover:bg-loss/10 transition-colors"
    aria-label="删除"
    title="删除"
  >
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" strokeLinecap="round" strokeLinejoin="round" /></svg>
  </button>
 </div>
</div>
  );
}
