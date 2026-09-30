import { DATA_KEYS, parsePortfolioBackup, type PortfolioBackup } from './portfolioBackup';
import { usePositionStore } from '../../store/usePositionStore';
import { useClosedPositionStore } from '../../store/useClosedPositionStore';
import { useCashStore } from '../../store/useCashStore';
import { useAssetHistoryStore } from '../../store/useAssetHistoryStore';

export interface CloudRecord {
  revision: number;
  savedAt: string;
  data: PortfolioBackup;
}

export function capturePortfolio(): PortfolioBackup {
  // Read raw storage so corrupt data cannot silently become an empty cloud backup.
  const data: Record<string, unknown> = {};
  for (const [name, key] of Object.entries(DATA_KEYS)) {
    data[name] = JSON.parse(localStorage.getItem(key) ?? '[]');
  }
  return parsePortfolioBackup({ format: 'portfolio-dashboard', version: 1, exportedAt: new Date().toISOString(), ...data });
}

export function restorePortfolio(data: PortfolioBackup): void {
  parsePortfolioBackup(data);
  const previous = Object.fromEntries(Object.values(DATA_KEYS).map((key) => [key, localStorage.getItem(key)]));
  // A persistent recovery copy must succeed before replacing any of the four lists.
  localStorage.setItem('portfolio-dashboard:before-restore:v1', JSON.stringify(previous));
  try {
    for (const [name, key] of Object.entries(DATA_KEYS)) {
      localStorage.setItem(key, JSON.stringify(data[name as keyof typeof DATA_KEYS]));
    }
  } catch (error) {
    for (const [key, value] of Object.entries(previous)) {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    }
    throw error;
  }
  usePositionStore.setState({ positions: data.positions });
  useClosedPositionStore.setState({ closedPositions: data.closedPositions });
  useCashStore.setState({ accounts: data.cashAccounts });
  useAssetHistoryStore.setState({ snapshots: [...data.assetSnapshots].sort((a, b) => a.date.localeCompare(b.date)) });
}

export function normalizeCloudUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('云端地址必须使用 HTTPS（本地测试可使用 localhost）。');
  }
  if (url.username || url.password || url.search || url.hash) throw new Error('云端地址不能包含密码、查询参数或片段。');
  return url.href.replace(/\/$/, '');
}

export async function cloudRequest(base: string, token: string, data?: PortfolioBackup, revision?: number): Promise<CloudRecord | null> {
  if (!token.trim()) throw new Error('请填写私密同步密钥。');
  const response = await fetch(`${normalizeCloudUrl(base)}/portfolio`, {
    method: data ? 'PUT' : 'GET',
    headers: { Authorization: `Bearer ${token.trim()}`, ...(data ? { 'Content-Type': 'application/json' } : {}) },
    body: data ? JSON.stringify({ data, expectedRevision: revision }) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 401) throw new Error('同步密钥不正确。');
  if (response.status === 409) throw new Error('云端已有更新，本次保存已阻止。请先检查或读取云端，再决定保存。');
  if (!response.ok) throw new Error(`云端请求失败（${response.status}），本地数据已保留。`);
  const raw = await response.json();
  if (raw === null) return null;
  if (!Number.isSafeInteger(raw.revision) || raw.revision < 1 || typeof raw.savedAt !== 'string') {
    throw new Error('云端返回的数据格式不正确。');
  }
  return { revision: raw.revision, savedAt: raw.savedAt, data: parsePortfolioBackup(raw.data) };
}
