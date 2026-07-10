/**
 * 历史仓位列表：展示已经平仓了结的仓位纪念档案。
 * 只读展示 + 支持删除误录入的记录，不支持编辑（平仓是"既成事实"，
 * 想改数据的话建议删除重新记录一条）。
 */
import type { ClosedPosition } from '@/types';
import { AssetIcon } from '@/components/common/AssetIcon';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useState } from 'react';
import { useClosedPositionStore } from '@/store/useClosedPositionStore';
import { formatCurrency, formatPercent, formatQuantity, getPnlColorClass } from '@/utils/formatters';

export function ClosedPositionList() {
  const closedPositions = useClosedPositionStore((s) => s.closedPositions);
  const deleteClosedPosition = useClosedPositionStore((s) => s.deleteClosedPosition);
  const [deleteTarget, setDeleteTarget] = useState<ClosedPosition | null>(null);

  if (closedPositions.length === 0) {
    return (
      <div className="glass-panel p-10 text-center text-text-secondary">
        还没有任何已了结的仓位。卖出持仓时点击「平仓」按钮，就会在这里留下纪念记录。
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">历史仓位</h2>
        <p className="text-sm text-text-muted mt-1">
          已了结的仓位纪念档案，共 {closedPositions.length} 笔
        </p>
      </div>

      <div className="space-y-3">
        {closedPositions.map((p) => {
          const pnlColor = getPnlColorClass(p.realizedPnlAmount);
          return (
            <div key={p.id} className="glass-panel glass-panel-hover p-4 flex items-center gap-4">
              <AssetIcon symbol={p.symbol} assetType={p.assetType} size={40} />

              <div className="min-w-0 flex-1 grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                <div className="min-w-0">
                  <div className="font-semibold text-text-primary truncate">{p.symbol}</div>
                  <div className="text-xs text-text-muted truncate">
                    {p.platform} · {formatQuantity(p.quantity)}
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="text-xs text-text-muted mb-0.5">买入 / 卖出</div>
                  <div className="text-text-primary font-medium">
                    {formatCurrency(p.costPrice)} → {formatCurrency(p.exitPrice)}
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="text-xs text-text-muted mb-0.5">已实现盈亏</div>
                  <div className={`font-medium ${pnlColor}`}>
                    {formatCurrency(p.realizedPnlAmount)} ({formatPercent(p.realizedPnlPercent)})
                  </div>
                </div>

                <div className="text-right md:text-left">
                  <div className="text-xs text-text-muted mb-0.5 hidden md:block">持仓天数 / 年化</div>
                  <div className="text-text-secondary text-sm">
                    {p.holdingDays} 天 · {formatPercent(p.annualizedReturnPercent)}
                  </div>
                </div>

                <div className="hidden md:block">
                  <div className="text-xs text-text-muted mb-0.5">了结日期</div>
                  <div className="text-text-secondary text-sm">
                    {new Date(p.closedAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDeleteTarget(p)}
                className="p-2 rounded-app-sm text-text-secondary hover:text-loss hover:bg-loss/10 transition-colors shrink-0"
                aria-label="删除记录"
                title="删除这条历史记录"
              >
                🗑️
              </button>
            </div>
          );
        })}
      </div>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="确认删除历史记录">
        <p className="text-text-secondary mb-5">
          确定要删除 <span className="text-text-primary font-medium">{deleteTarget?.symbol}</span>
          的这条历史记录吗？此操作不可撤销。
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
            取消
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              if (deleteTarget) deleteClosedPosition(deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            确认删除
          </Button>
        </div>
      </Modal>
    </div>
  );
}