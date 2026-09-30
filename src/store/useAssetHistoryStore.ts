import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { AssetSnapshot } from '@/types';
import { loadAssetSnapshots, saveAssetSnapshots } from '@/services/storage/localStorage';

type SnapshotInput = Omit<AssetSnapshot, 'id' | 'createdAt'>;

interface AssetHistoryStore {
  snapshots: AssetSnapshot[];
  upsertSnapshot: (input: SnapshotInput) => void;
  deleteSnapshot: (id: string) => void;
}

export const useAssetHistoryStore = create<AssetHistoryStore>((set, get) => ({
  snapshots: loadAssetSnapshots().sort((a, b) => a.date.localeCompare(b.date)),
  upsertSnapshot: (input) => {
    const existing = get().snapshots.find((item) => item.date === input.date);
    const next = existing
      ? get().snapshots.map((item) => item.date === input.date ? { ...item, ...input } : item)
      : [...get().snapshots, { ...input, id: uuidv4(), createdAt: new Date().toISOString() }];
    next.sort((a, b) => a.date.localeCompare(b.date));
    saveAssetSnapshots(next);
    set({ snapshots: next });
  },
  deleteSnapshot: (id) => {
    const next = get().snapshots.filter((item) => item.id !== id);
    saveAssetSnapshots(next);
    set({ snapshots: next });
  },
}));
