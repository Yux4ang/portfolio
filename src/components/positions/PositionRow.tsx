import type { EnrichedPosition } from '@/types';
import { AssetIcon } from '@/components/common/AssetIcon';
import { formatCurrency, formatPercent, formatQuantity, getPnlColorClass } from '@/utils/formatters';
import { getPositionPurchaseTime } from '@/utils/positionView';

interface PositionRowProps {
  position: EnrichedPosition;
  compact?: boolean;
  onEdit: (position: EnrichedPosition) => void;
  onDelete: (position: EnrichedPosition) => void;
  onClosePosition: (position: EnrichedPosition) => void;
}

export function PositionRow({ position, compact = false, onEdit, onDelete, onClosePosition }: PositionRowProps) {
  const pnlColor = getPnlColorClass(position.pnlAmount);
  const purchaseTime = getPositionPurchaseTime(position);
  const hasPurchaseDate = !!position.purchasedAt && Number.isFinite(Date.parse(position.purchasedAt));
  // Date-only purchases are calendar dates; do not shift them by the local timezone.
  const dateLabel = purchaseTime === null ? '日期未知'
    : new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        ...(hasPurchaseDate && /^\d{4}-\d{2}-\d{2}$/.test(position.purchasedAt!) ? { timeZone: 'UTC' } : {}),
      }).format(new Date(purchaseTime));

  return (
    <article className={`position-item glass-panel glass-panel-hover ${compact ? 'position-item-card' : 'position-item-row'}`} aria-label={`${position.symbol} · ${position.platform}`}>
      <div className="position-identity">
        <AssetIcon symbol={position.symbol} assetType={position.assetType} size={40} />
        <div className="min-w-0">
          <h3 className="font-semibold text-text-primary truncate">{position.symbol}</h3>
          <p className="text-xs text-text-muted truncate" title={position.platform}>{position.platform} · {formatQuantity(position.quantity)}</p>
        </div>
      </div>
      <dl className="position-metrics">
        <div>
          <dt>市值</dt>
          <dd>{position.priceStatus === 'loading' ? <span className="text-text-muted text-sm">加载中…</span> : formatCurrency(position.marketValue)}</dd>
        </div>
        <div>
          <dt>盈亏</dt>
          <dd className={pnlColor}>{formatCurrency(position.pnlAmount)}</dd>
        </div>
        <div>
          <dt>盈亏 %</dt>
          <dd className={pnlColor}>{formatPercent(position.pnlPercent)}</dd>
        </div>
        <div>
          <dt>占总资产</dt>
          <dd>{formatPercent(position.percentOfTotal, false)}</dd>
        </div>
      </dl>
      <div className="position-item-footer">
        <div className="position-date">
          <span>{hasPurchaseDate ? '购买日期' : '建仓日期'}</span>
          {purchaseTime === null ? <span>{dateLabel}</span> : <time dateTime={new Date(purchaseTime).toISOString()}>{dateLabel}</time>}
        </div>
        <div className="flex gap-1 shrink-0" role="group" aria-label={`${position.symbol} 仓位操作`}>
          <button type="button" onClick={() => onClosePosition(position)} className="position-action hover:text-brand-500 hover:bg-brand-50" aria-label="平仓" title="平仓（记录为已了结）">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 8h16v12H4zM3 4h18v4H3zM9 12h6" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => onEdit(position)} className="position-action hover:text-brand-500 hover:bg-brand-50" aria-label="编辑" title="编辑">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => onDelete(position)} className="position-action hover:text-loss hover:bg-loss-bg" aria-label="删除" title="删除">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}
