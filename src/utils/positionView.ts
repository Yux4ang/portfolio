import type { EnrichedPosition, Position } from '@/types';

export type PositionSort = 'purchased-newest' | 'purchased-oldest' | 'market-value';
export type PositionColumns = 1 | 2 | 3;

/** Old/imported records may omit the purchase date or contain an invalid date. */
export function getPositionPurchaseTime(position: Pick<Position, 'purchasedAt' | 'createdAt'>): number | null {
  for (const value of [position.purchasedAt, position.createdAt]) {
    if (!value?.trim()) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

export function sortPositions(positions: EnrichedPosition[], sort: PositionSort): EnrichedPosition[] {
  return [...positions].sort((a, b) => {
    if (sort === 'market-value') return (b.marketValue ?? 0) - (a.marketValue ?? 0);
    const left = getPositionPurchaseTime(a);
    const right = getPositionPurchaseTime(b);
    // Unknown dates always go last, independent of the selected direction.
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return sort === 'purchased-oldest' ? left - right : right - left;
  });
}

const VIEW_KEY = 'portfolio-ui:positions-view:v1';
export interface PositionViewPreferences { sort: PositionSort; columns: PositionColumns }

export function loadPositionView(): PositionViewPreferences {
  const defaults: PositionViewPreferences = { sort: 'purchased-newest', columns: 2 };
  try {
    const value = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null');
    if (!value || typeof value !== 'object') return defaults;
    return {
      sort: ['purchased-newest', 'purchased-oldest', 'market-value'].includes(value.sort) ? value.sort : defaults.sort,
      columns: [1, 2, 3].includes(value.columns) ? value.columns : defaults.columns,
    };
  } catch { return defaults; }
}

export function savePositionView(value: PositionViewPreferences): void {
  try { localStorage.setItem(VIEW_KEY, JSON.stringify(value)); }
  catch { /* Display preferences remain usable when browser storage is unavailable. */ }
}
