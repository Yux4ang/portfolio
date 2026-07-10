/**
 * 历史仓位列表：展示已经平仓了结的仓位纪念档案。
 * 支持编辑（修正购入日期/了结日期/卖出价格，自动重算派生指标）
 * 和删除（误录入记录的撤销）。
 */
import { useState } from 'react';
import type { ClosedPosition } from '@/types';
import { AssetIcon } from '@/components/common/AssetIcon';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useClosedPositionStore } from '@/store/useClosedPositionStore';
import { formatCurrency, formatPercent, formatQuantity, getPnlColorClass } from '@/utils/formatters';

/** ISO 时间字符串 -> <input type="date"> 需要的 YYYY-MM-DD 格式 */
function toDateInputValue(isoString: string): string {
  return isoString.slice(0, 10);
}

export function ClosedPositionList() {
  const closedPositions = useClosedPositionStore((s) => s.closedPositions);
  const deleteClosedPosition = useClosedPositionStore((s) => s.deleteClosedPosition);
  const updateClosedPosition = useClosedPositionStore((s) => s.updateClosedPosition);

  const [deleteTarget, setDeleteTarget] = useState<ClosedPosition | null>(null);
  const [editTarget, setEditTarget] = useState<ClosedPosition | null>(null);
  const [editOpenedAt, setEditOpenedAt] = useState('');
  const [editClosedAt, setEditClosedAt] = useState('');
  const [editExitPrice, setEditExitPrice] = useState('');

  function handleOpenEdit(p: ClosedPosition) {
    setEditTarget(p);
    setEditOpenedAt(toDateInputValue(p.openedAt));
    setEditClosedAt(toDateInputValue(p.closedAt));
    setEditExitPrice(String(p.exitPrice));
  }

  function handleConfirmEdit() {
    if (!editTarget) return;
    const exitPrice = parseFloat(editExitPrice);
    if (Number.isNaN(exitPrice) || exitPrice <= 0) return;
    if (!editOpenedAt || !editClosedAt) return;

    updateClosedPosition(editTarget.id, {
      openedAt: new Date(editOpenedAt).toISOString(),
      closedAt: new Date(editClosedAt).toISOString(),
      exitPrice,
    });
    setEditTarget(null);
  }

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

              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-2 rounded-app-sm text-text-secondary hover:text-text-primary hover:bg-white/10 transition-colors"
                  aria-label="编辑"
                  title="编辑这条历史记录"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="p-2 rounded-app-sm text-text-secondary hover:text-loss hover:bg-loss/10 transition-colors"
                  aria-label="删除记录"
                  title="删除这条历史记录"
                >
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 编辑弹窗 */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="编辑历史仓位">
        <p className="text-text-secondary mb-4">
          修改 <span className="text-text-primary font-medium">{editTarget?.symbol}</span>
          的记录，保存后会自动重新计算已实现盈亏、持仓天数和年化收益率。
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">购入日期</label>
            <input
              type="date"
              className="input-field"
              value={editOpenedAt}
              onChange={(e) => setEditOpenedAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">了结日期</label>
            <input
              type="date"
              className="input-field"
              value={editClosedAt}
              onChange={(e) => setEditClosedAt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">卖出价格</label>
            <input
              type="number"
              step="any"
              className="input-field"
              value={editExitPrice}
              onChange={(e) => setEditExitPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setEditTarget(null)}>
            取消
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleConfirmEdit}>
            保存修改
          </Button>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
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