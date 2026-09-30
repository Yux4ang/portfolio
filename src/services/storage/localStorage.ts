/**
 * ============================================================================
 * 本地持久化层（localStorage）
 * ============================================================================
 * 把所有跟 localStorage 直接打交道的代码集中在这一个文件里。
 * 好处：以后如果想换成 IndexedDB（数据量大了之后 localStorage 会不够用），
 * 只需要重写这一个文件里的三个函数，其他代码（store、hooks）完全不用改，
 * 因为它们只依赖这里导出的接口，不直接碰 window.localStorage。
 */
import type { AssetSnapshot, CashAccount, Position } from '@/types';
import { APP_CONFIG } from '@/config/app';

const STORAGE_KEY = APP_CONFIG.storageKey;

/** 从 localStorage 读取全部仓位数据。读取失败或数据损坏时返回空数组，不抛错。 */
export function loadPositions(): Position[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Position[];
  } catch (err) {
    console.error('[storage] 读取本地仓位数据失败，已重置为空列表:', err);
    return [];
  }
}

/** 将全部仓位数据写入 localStorage */
export function savePositions(positions: Position[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch (err) {
    console.error('[storage] 写入本地仓位数据失败:', err);
  }
}

/** 清空本地全部仓位数据（危险操作，调用前应在 UI 层做二次确认） */
export function clearPositions(): void {
  localStorage.removeItem(STORAGE_KEY);
}


import type { ClosedPosition } from '@/types';

const CLOSED_STORAGE_KEY = APP_CONFIG.closedPositionsStorageKey;

/** 从 localStorage 读取全部已了结仓位。读取失败或数据损坏时返回空数组。 */
export function loadClosedPositions(): ClosedPosition[] {
  try {
    const raw = localStorage.getItem(CLOSED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ClosedPosition[];
  } catch (err) {
    console.error('[storage] 读取已了结仓位数据失败，已重置为空列表:', err);
    return [];
  }
}

/** 将全部已了结仓位写入 localStorage */
export function saveClosedPositions(closedPositions: ClosedPosition[]): void {
  try {
    localStorage.setItem(CLOSED_STORAGE_KEY, JSON.stringify(closedPositions));
  } catch (err) {
    console.error('[storage] 写入已了结仓位数据失败:', err);
  }
}

/** 清空全部已了结仓位（危险操作） */
export function clearClosedPositions(): void {
  localStorage.removeItem(CLOSED_STORAGE_KEY);
}

function loadArray<T>(key: string): T[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export const loadCashAccounts = (): CashAccount[] =>
  loadArray<CashAccount>(APP_CONFIG.cashAccountsStorageKey);

export const saveCashAccounts = (accounts: CashAccount[]): void =>
  localStorage.setItem(APP_CONFIG.cashAccountsStorageKey, JSON.stringify(accounts));

export const loadAssetSnapshots = (): AssetSnapshot[] =>
  loadArray<AssetSnapshot>(APP_CONFIG.assetSnapshotsStorageKey);

export const saveAssetSnapshots = (snapshots: AssetSnapshot[]): void =>
  localStorage.setItem(APP_CONFIG.assetSnapshotsStorageKey, JSON.stringify(snapshots));
