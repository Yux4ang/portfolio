/**
 * ============================================================================
 * 全局状态管理（Zustand）
 * ============================================================================
 * 只负责管理"仓位数据本身"的增删改查 + 持久化，不负责价格拉取
 * （价格拉取和刷新逻辑在 hooks/usePriceFeed.ts，两者职责分离）。
 *
 * 为什么用 Zustand 而不是 Context API？
 * Zustand 不需要包裹 Provider，写法更简洁，且天然支持"只订阅需要的字段"，
 * 避免任意一个仓位变化导致整棵组件树重新渲染。
 */
import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Position, PositionInput } from '@/types';
import { loadPositions, savePositions } from '@/services/storage/localStorage';

interface PositionStore {
  /** 全部仓位（原始数据，不含实时价格） */
  positions: Position[];

  /** 新增一条仓位 */
  addPosition: (input: PositionInput) => void;

  /** 编辑一条仓位（按 id 定位） */
  updatePosition: (id: string, input: PositionInput) => void;

  /** 删除一条仓位 */
  deletePosition: (id: string) => void;

  /** 批量导入仓位（追加模式，不清空现有数据） */
  importPositions: (inputs: (PositionInput | Position)[]) => void;

  /** 清空全部仓位（危险操作） */
  clearAllPositions: () => void;
}

/** 内部工具：每次修改 positions 后同步写入 localStorage，保持状态和持久化层一致 */
function persistAndSet(
  set: (partial: Partial<PositionStore>) => void,
  positions: Position[]
): void {
  savePositions(positions);
  set({ positions });
}

export const usePositionStore = create<PositionStore>((set, get) => ({
  positions: loadPositions(),

  addPosition: (input) => {
    const now = new Date().toISOString();
    const newPosition: Position = {
      ...input,
      symbol: input.symbol.toUpperCase(),
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    persistAndSet(set, [...get().positions, newPosition]);
  },

  updatePosition: (id, input) => {
    const now = new Date().toISOString();
    const updated = get().positions.map((p) =>
      p.id === id
        ? { ...p, ...input, symbol: input.symbol.toUpperCase(), updatedAt: now }
        : p
    );
    persistAndSet(set, updated);
  },

  deletePosition: (id) => {
    persistAndSet(
      set,
      get().positions.filter((p) => p.id !== id)
    );
  },

  importPositions: (inputs) => {
    const now = new Date().toISOString();
    const newPositions: Position[] = inputs.map((input) => {
      // 兼容两种情况：已经是完整 Position（JSON 备份导入），或只有基础字段（CSV 导入）
      if ('id' in input && 'createdAt' in input) {
        return { ...input, symbol: input.symbol.toUpperCase() } as Position;
      }
      return {
        ...(input as PositionInput),
        symbol: input.symbol.toUpperCase(),
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
      };
    });
    persistAndSet(set, [...get().positions, ...newPositions]);
  },

  clearAllPositions: () => {
    persistAndSet(set, []);
  },
}));
