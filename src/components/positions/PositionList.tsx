/**
 * 仓位列表容器：负责渲染仓位行列表、空状态提示、以及新增/编辑/平仓弹窗的调度。
 */
import { useState } from 'react';
import type { EnrichedPosition, PositionInput, Position } from '@/types';
import { PositionRow } from './PositionRow';
import { PositionForm } from './PositionForm';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { usePositionStore } from '@/store/usePositionStore';
import { useClosedPositionStore } from '@/store/useClosedPositionStore';
import { buildClosedPosition } from '@/utils/calculations';

interface PositionListProps {
  positions: EnrichedPosition[];
  title?: string;
}

export function PositionList({ positions, title = '全部仓位' }: PositionListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedPosition | null>(null);
  const [closeTarget, setCloseTarget] = useState<EnrichedPosition | null>(null);
  const [exitPriceInput, setExitPriceInput] = useState('');

  const addPosition = usePositionStore((s) => s.addPosition);
  const updatePosition = usePositionStore((s) => s.updatePosition);
  const deletePosition = usePositionStore((s) => s.deletePosition);
  const addClosedPosition = useClosedPositionStore((s) => s.addClosedPosition);

  const sortedPositions = [...positions].sort(
    (a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)
  );

  function handleOpenAdd() {
    setEditingPosition(undefined);
    setFormOpen(true);
  }
  function handleOpenEdit(position: EnrichedPosition) {
    setEditingPosition(position);
    setFormOpen(true);
  }
  function handleSubmit(input: PositionInput) {
    if (editingPosition) {
      updatePosition(editingPosition.id, input);
    } else {
      addPosition(input);
    }
    setFormOpen(false);
  }
  function handleConfirmDelete() {
    if (deleteTarget) {
      deletePosition(deleteTarget.id);
      setDeleteTarget(null);
    }
  }

  function handleOpenClose(position: EnrichedPosition) {
    setCloseTarget(position);
    // 默认带入当前市价，用户可以手动改成实际成交价
    setExitPriceInput(position.currentPrice !== null ? String(position.currentPrice) : '');
  }

  function handleConfirmClose() {
    if (!closeTarget) return;
    const exitPrice = parseFloat(exitPriceInput);
    if (Number.isNaN(exitPrice) || exitPrice <= 0) return;

    const closedAt = new Date().toISOString();
    const record = buildClosedPosition(closeTarget, exitPrice, closedAt);
    addClosedPosition(record);
    deletePosition(closeTarget.id);
    setCloseTarget(null);
    setExitPriceInput('');
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        <Button variant="primary" onClick={handleOpenAdd}>
          + 新增仓位
        </Button>
      </div>

      {sortedPositions.length === 0 ? (
        <div className="glass-panel p-10 text-center text-text-secondary">
          还没有任何仓位记录，点击右上角「+ 新增仓位」开始记录你的第一笔持仓吧。
        </div>
      ) : (
        <div className="space-y-3">
          {sortedPositions.map((p) => (
            <PositionRow
              key={p.id}
              position={p}
              onEdit={handleOpenEdit}
              onDelete={setDeleteTarget}
              onClosePosition={handleOpenClose}
            />
          ))}
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editingPosition ? '编辑仓位' : '新增仓位'}
      >
        <PositionForm
          initialValue={editingPosition}
          onSubmit={handleSubmit}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="确认删除">
        <p className="text-text-secondary mb-5">
          确定要删除仓位 <span className="text-text-primary font-medium">{deleteTarget?.symbol}</span>
          （{deleteTarget?.platform}）吗？此操作不可撤销，也不会记录到历史仓位中。
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setDeleteTarget(null)}>
            取消
          </Button>
          <Button variant="danger" className="flex-1" onClick={handleConfirmDelete}>
            确认删除
          </Button>
        </div>
      </Modal>

      {/* 平仓弹窗 */}
      <Modal open={!!closeTarget} onClose={() => setCloseTarget(null)} title="平仓 —— 记录已了结仓位">
        <p className="text-text-secondary mb-3">
          将 <span className="text-text-primary font-medium">{closeTarget?.symbol}</span>
          （{closeTarget?.platform}）标记为已了结，会从当前仓位中移除，并保存到"历史仓位"里作为纪念。
        </p>
        <label className="block text-sm text-text-secondary mb-1">卖出价格</label>
        <input
          type="number"
          step="any"
          className="input-field mb-4"
          value={exitPriceInput}
          onChange={(e) => setExitPriceInput(e.target.value)}
          placeholder="输入实际成交价格"
          autoFocus
        />
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => setCloseTarget(null)}>
            取消
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleConfirmClose}
            disabled={!exitPriceInput || Number.isNaN(parseFloat(exitPriceInput))}
          >
            确认平仓
          </Button>
        </div>
      </Modal>
    </div>
  );
}