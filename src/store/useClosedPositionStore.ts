/**
 * ============================================================================
 * 已了结仓位 Store（Zustand）
 * ============================================================================
 * 和 usePositionStore 结构完全对称，但管理的是"历史纪念档案"而不是
 * "当前持仓"。两者数据互不相关，分开持久化。
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ClosedPosition } from '@/types';
import {
  loadClosedPositions,
  saveClosedPositions,
} from '@/services/storage/localStorage';

interface ClosedPositionStore {
  closedPositions: ClosedPosition[];
  /** 新增一条已了结记录（id 自动生成） */
  addClosedPosition: (record: Omit<ClosedPosition, 'id'>) => void;
  /** 删除一条历史记录（比如录入错误需要撤销） */
  deleteClosedPosition: (id: string) => void;
  clearAllClosedPositions: () => void;
}

function persistAndSet(
  set: (partial: Partial<ClosedPositionStore>) => void,
  closedPositions: ClosedPosition[]
): void {
  saveClosedPositions(closedPositions);
  set({ closedPositions });
}

export const useClosedPositionStore = create<ClosedPositionStore>((set, get) => ({
  closedPositions: loadClosedPositions(),
  addClosedPosition: (record) => {
    const newRecord: ClosedPosition = { ...record, id: uuidv4() };
    persistAndSet(set, [newRecord, ...get().closedPositions]);
  },
  deleteClosedPosition: (id) => {
    persistAndSet(
      set,
      get().closedPositions.filter((p) => p.id !== id)
    );
  },
  clearAllClosedPositions: () => {
    persistAndSet(set, []);
  },
}));