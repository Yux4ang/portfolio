import type { Position, ClosedPosition, CashAccount, AssetSnapshot } from '../../types';

export interface PortfolioBackup {
  format: 'portfolio-dashboard';
  version: 1;
  exportedAt: string;
  positions: Position[];
  closedPositions: ClosedPosition[];
  cashAccounts: CashAccount[];
  assetSnapshots: AssetSnapshot[];
}

export const DATA_KEYS = {
  positions: 'portfolio-dashboard:positions:v1',
  closedPositions: 'portfolio-dashboard:closed-positions:v1',
  cashAccounts: 'portfolio-dashboard:cash-accounts:v1',
  assetSnapshots: 'portfolio-dashboard:asset-snapshots:v1',
} as const;

const schemas = {
  positions: { strings: ['id', 'symbol', 'assetType', 'platform', 'createdAt', 'updatedAt'], numbers: ['costPrice', 'quantity'] },
  closedPositions: { strings: ['id', 'symbol', 'assetType', 'platform', 'openedAt', 'closedAt'], numbers: ['costPrice', 'exitPrice', 'quantity', 'realizedPnlAmount', 'realizedPnlPercent', 'holdingDays', 'annualizedReturnPercent'] },
  cashAccounts: { strings: ['id', 'name', 'platform', 'createdAt', 'updatedAt'], numbers: ['balance'] },
  assetSnapshots: { strings: ['id', 'date', 'createdAt'], numbers: ['totalAssets', 'investmentValue', 'cashValue'] },
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validate without rebuilding records: IDs, dates and additional fields survive migration. */
export function parsePortfolioBackup(value: unknown): PortfolioBackup {
  if (!isObject(value) || value.format !== 'portfolio-dashboard' || value.version !== 1 ||
      typeof value.exportedAt !== 'string' || !Number.isFinite(Date.parse(value.exportedAt))) {
    throw new Error('不是受支持的完整备份文件。');
  }
  for (const [name, schema] of Object.entries(schemas)) {
    const records = value[name];
    if (!Array.isArray(records)) throw new Error(`备份缺少 ${name}，不会修改现有数据。`);
    const ids = new Set<string>();
    for (const record of records) {
      if (!isObject(record) ||
          schema.strings.some((key) => typeof record[key] !== 'string' || !record[key]) ||
          schema.numbers.some((key) => typeof record[key] !== 'number' || !Number.isFinite(record[key]))) {
        throw new Error(`${name} 包含无效记录，不会修改现有数据。`);
      }
      if ('assetType' in record && record.assetType !== 'stock' && record.assetType !== 'crypto') {
        throw new Error(`${name} 包含不支持的资产类型。`);
      }
      for (const key of ['purchasedAt', 'note']) {
        if (record[key] !== undefined && typeof record[key] !== 'string') throw new Error(`${name} 的 ${key} 无效。`);
      }
      const id = record.id as string;
      if (ids.has(id)) throw new Error(`${name} 包含重复 ID，请先检查备份。`);
      ids.add(id);
    }
  }
  return value as unknown as PortfolioBackup;
}

/** Also accepts the raw localStorage backup downloaded from the old website. */
export function parseBackupFile(text: string): PortfolioBackup {
  const raw: unknown = JSON.parse(text);
  if (isObject(raw) && !('format' in raw)) {
    if (!(DATA_KEYS.positions in raw) && !(DATA_KEYS.closedPositions in raw)) {
      throw new Error('文件不包含完整持仓备份；普通持仓 JSON 请使用原有导入按钮。');
    }
    const data: Record<string, unknown> = {};
    for (const [name, key] of Object.entries(DATA_KEYS)) {
      if (key in raw && typeof raw[key] !== 'string') throw new Error(`原始备份 ${key} 无效。`);
      data[name] = key in raw ? JSON.parse(raw[key] as string) : [];
    }
    return parsePortfolioBackup({ format: 'portfolio-dashboard', version: 1, exportedAt: new Date().toISOString(), ...data });
  }
  return parsePortfolioBackup(raw);
}

export function backupCounts(data: PortfolioBackup): string {
  return `持仓 ${data.positions.length} 条、已平仓 ${data.closedPositions.length} 条、现金账户 ${data.cashAccounts.length} 个、资产快照 ${data.assetSnapshots.length} 条`;
}

export function recordCount(data: PortfolioBackup): number {
  return data.positions.length + data.closedPositions.length + data.cashAccounts.length + data.assetSnapshots.length;
}
