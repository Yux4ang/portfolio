/**
 * ============================================================================
 * 导入 / 导出 服务（CSV & JSON）
 * ============================================================================
 * 独立成模块，方便以后新增其他格式（比如 Excel）时直接加一对 exportXxx/importXxx
 * 函数，不需要改动调用方（SettingsPanel 组件）的逻辑。
 *
 * 数据校验策略：导入时逐行校验，格式错误的行会被跳过并记录原因，
 * 而不是一条错误就让整个导入失败——这样用户体验更好。
 */
import Papa from 'papaparse';
import { v4 as uuidv4 } from 'uuid';
import type { Position, PositionInput, AssetType } from '@/types';

/** CSV 列头，导出和导入都用这一套字段名，保持一致 */
const CSV_COLUMNS = [
  'symbol',
  'assetType',
  'costPrice',
  'quantity',
  'platform',
  'note',
] as const;

// ------------------------------ 导出 ------------------------------

/** 将仓位数组导出为 CSV 字符串 */
export function exportToCSV(positions: Position[]): string {
  const rows = positions.map((p) => ({
    symbol: p.symbol,
    assetType: p.assetType,
    costPrice: p.costPrice,
    quantity: p.quantity,
    platform: p.platform,
    note: p.note ?? '',
  }));
  return Papa.unparse({ fields: [...CSV_COLUMNS], data: rows });
}

/** 将仓位数组导出为 JSON 字符串（保留全部字段，包括 id/时间戳，适合做完整备份） */
export function exportToJSON(positions: Position[]): string {
  return JSON.stringify(positions, null, 2);
}

/** 触发浏览器下载文件的通用小工具 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ------------------------------ 导入 ------------------------------

export interface ImportResult {
  /** 成功解析出的仓位（还未写入 store，调用方决定是"追加"还是"覆盖"） */
  positions: PositionInput[];
  /** 解析失败的行及原因，展示给用户，帮助其修正数据 */
  errors: string[];
}

const VALID_ASSET_TYPES: AssetType[] = ['stock', 'crypto'];

/** 校验并规范化单行数据，失败时返回 null 并把原因塞进 errors */
function normalizeRow(
  row: Record<string, unknown>,
  rowIndex: number,
  errors: string[]
): PositionInput | null {
  const symbol = String(row.symbol ?? '').trim().toUpperCase();
  const assetType = String(row.assetType ?? '').trim().toLowerCase() as AssetType;
  const costPrice = parseFloat(String(row.costPrice));
  const quantity = parseFloat(String(row.quantity));
  const platform = String(row.platform ?? '').trim();
  const note = row.note ? String(row.note).trim() : undefined;

  if (!symbol) {
    errors.push(`第 ${rowIndex} 行：symbol 不能为空`);
    return null;
  }
  if (!VALID_ASSET_TYPES.includes(assetType)) {
    errors.push(`第 ${rowIndex} 行：assetType 必须是 "stock" 或 "crypto"，实际是 "${row.assetType}"`);
    return null;
  }
  if (Number.isNaN(costPrice) || costPrice < 0) {
    errors.push(`第 ${rowIndex} 行：costPrice 无效`);
    return null;
  }
  if (Number.isNaN(quantity) || quantity <= 0) {
    errors.push(`第 ${rowIndex} 行：quantity 无效`);
    return null;
  }
  if (!platform) {
    errors.push(`第 ${rowIndex} 行：platform 不能为空`);
    return null;
  }

  return { symbol, assetType, costPrice, quantity, platform, note };
}

/** 从 CSV 文本导入仓位 */
export function importFromCSV(csvText: string): ImportResult {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, unknown>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    parsed.errors.forEach((e) => errors.push(`CSV 解析错误: ${e.message}`));
  }

  const positions: PositionInput[] = [];
  parsed.data.forEach((row, idx) => {
    const normalized = normalizeRow(row, idx + 2 /* 第1行是表头 */, errors);
    if (normalized) positions.push(normalized);
  });

  return { positions, errors };
}

/** 从 JSON 文本导入仓位（支持完整备份格式，也兼容只含必要字段的简化格式） */
export function importFromJSON(jsonText: string): ImportResult {
  const errors: string[] = [];
  let raw: unknown;

  try {
    raw = JSON.parse(jsonText);
  } catch (err) {
    return { positions: [], errors: [`JSON 格式错误: ${(err as Error).message}`] };
  }

  if (!Array.isArray(raw)) {
    return { positions: [], errors: ['JSON 顶层必须是数组'] };
  }

  const positions: PositionInput[] = [];
  raw.forEach((row, idx) => {
    const normalized = normalizeRow(row as Record<string, unknown>, idx + 1, errors);
    if (normalized) positions.push(normalized);
  });

  return { positions, errors };
}

/** 把 PositionInput（缺少 id/时间戳）补全成完整的 Position */
export function toFullPosition(input: PositionInput): Position {
  const now = new Date().toISOString();
  return {
    ...input,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
}
