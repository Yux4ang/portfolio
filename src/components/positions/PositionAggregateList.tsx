/**
 * 仓位聚合列表：把同一个 symbol 在不同平台/不同笔录入的仓位合并成一条卡片展示。
 * 卡片式布局，支持手动调整每行展示的卡片数量（3-6 张），
 * 卡片背景色取自该资产 logo 的平均色，营造"品牌色呼应"的视觉效果。
 */
import { useState } from 'react';
import type { AggregatedPosition } from '@/utils/calculations';
import { AssetIcon } from '@/components/common/AssetIcon';
import { useCardTintColor } from '@/hooks/useCardTintColor';
import { formatCurrency, formatPercent, formatQuantity, getPnlColorClass } from '@/utils/formatters';

interface PositionAggregateListProps {
  positions: AggregatedPosition[];
}

const COLUMN_CLASS_MAP: Record<number, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

const COLUMN_OPTIONS = [3, 4, 5, 6];

function AggregateCard({ position: p }: { position: AggregatedPosition }) {
  const pnlColor = getPnlColorClass(p.totalPnlAmount);
  const tintRgb = useCardTintColor(p.symbol, p.assetType);

  return (
    <div
      className="glass-panel-hover p-4 flex flex-col gap-3 border"
      style={{
        borderRadius: '28px',
        background: `linear-gradient(135deg, rgba(${tintRgb}, 0.28), rgba(${tintRgb}, 0.06))`,
        borderColor: `rgba(${tintRgb}, 0.25)`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo + Name + 平台/数量 */}
      <div className="flex items-center gap-3 min-w-0">
        <AssetIcon symbol={p.symbol} assetType={p.assetType} size={40} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-text-primary truncate">{p.symbol}</div>
          <div className="text-xs text-text-muted truncate">
            {p.platforms.join(' · ')} · {formatQuantity(p.totalQuantity)}
          </div>
        </div>
      </div>

      {/* 市值 */}
      <div className="text-right">
        <div className="text-lg font-semibold text-text-primary">
          {p.totalMarketValue !== null ? formatCurrency(p.totalMarketValue) : '--'}
        </div>
        <div className={`text-sm font-medium ${pnlColor}`}>
          {p.totalPnlAmount !== null
            ? `${p.totalPnlAmount >= 0 ? '+' : ''}${formatCurrency(p.totalPnlAmount)}`
            : '--'}
          {p.totalPnlPercent !== null && ` (${formatPercent(p.totalPnlPercent)})`}
        </div>
      </div>

      {/* 均价 (break even) + 占总资产 */}
      <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-white/10">
        <span>均价 {formatCurrency(p.avgCostPrice)}</span>
        <span>占比 {formatPercent(p.percentOfTotal, false)}</span>
      </div>
    </div>
  );
}

export function PositionAggregateList({ positions }: PositionAggregateListProps) {
  const [columns, setColumns] = useState(4);

  if (positions.length === 0) {
    return (
      <div className="glass-panel p-10 text-center text-text-secondary">
        还没有任何仓位记录。
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">仓位聚合</h2>
          <p className="text-sm text-text-muted mt-1">
            同一支股票/币种在不同平台的持仓已合并展示，均价按加权平均计算
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">每行</span>
          <div className="flex gap-1 bg-white/5 rounded-app-sm p-1">
            {COLUMN_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setColumns(n)}
                className={`px-2.5 py-1 rounded-app-sm text-xs font-medium transition-colors ${
                  columns === n
                    ? 'bg-brand-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid ${COLUMN_CLASS_MAP[columns]} gap-4`}>
        {positions.map((p) => (
          <AggregateCard key={p.symbol} position={p} />
        ))}
      </div>
    </div>
  );
}