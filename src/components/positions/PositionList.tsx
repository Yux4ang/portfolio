/**
 * 仓位列表容器：负责渲染仓位行列表、空状态提示、以及新增/编辑弹窗的调度。
 */
import { useState } from 'react';
import type { EnrichedPosition, PositionInput, Position } from '@/types';
import { PositionRow } from './PositionRow';
import { PositionForm } from './PositionForm';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import { usePositionStore } from '@/store/usePositionStore';

interface PositionListProps {
  positions: EnrichedPosition[];
  /** 可选：只展示某个平台的仓位时传入平台名，用于标题展示 */
  title?: string;
}

export function PositionList({ positions, title = '全部仓位' }: PositionListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedPosition | null>(null);

  const addPosition = usePositionStore((s) => s.addPosition);
  const updatePosition = usePositionStore((s) => s.updatePosition);
  const deletePosition = usePositionStore((s) => s.deletePosition);

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

const sortedPositions = [...positions].sort(
  (a, b) => (b.marketValue ?? 0) - (a.marketValue ?? 0)
);
  
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
  />
))}
</div>
      )}
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

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="确认删除">
        <p className="text-text-secondary mb-5">
          确定要删除仓位 <span className="text-text-primary font-medium">{deleteTarget?.symbol}</span>
          （{deleteTarget?.platform}）吗？此操作不可撤销。
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
    </div>
  );
}
