/**
 * ============================================================================
 * 核心计算逻辑（纯函数）
 * ============================================================================
 * 这里的函数都是纯函数：给定输入，一定返回相同输出，不依赖外部状态。
 * 好处：
 *   1. 容易单独测试
 *   2. 计算口径统一，不会出现"总览页面"和"仓位列表"算出来的盈亏对不上的问题
 *   3. 以后要改计算规则（比如加入手续费）只需要改这一个文件
 */
import type { Position, PriceQuote, EnrichedPosition } from '@/types';

/**
 * 将一条原始仓位 + 对应的实时报价，合并计算成 EnrichedPosition（视图模型）。
 * 如果 quote 为 undefined（价格还没拉到或拉取失败），市值/盈亏相关字段会是 null，
 * 调用方（UI）需要对 null 做兜底展示（例如显示"--"或 loading 骨架屏）。
 */
export function enrichPosition(
  position: Position,
  quote: PriceQuote | undefined,
  priceStatus: 'ok' | 'loading' | 'error'
): EnrichedPosition {
  const costValue = position.costPrice * position.quantity;
  const currentPrice = quote?.price ?? null;

  const marketValue = currentPrice !== null ? currentPrice * position.quantity : null;
  const pnlAmount = marketValue !== null ? marketValue - costValue : null;
  const pnlPercent =
    pnlAmount !== null && costValue !== 0 ? (pnlAmount / costValue) * 100 : null;

  return {
    ...position,
    currentPrice,
    marketValue,
    costValue,
    pnlAmount,
    pnlPercent,
    percentOfTotal: 0, // 占位，稍后由 computePercentOfTotal 统一填充
    priceStatus,
  };
}

/**
 * 给一组已经 enrich 过的仓位，计算每条仓位"占总资产的百分比"。
 * 必须在拿到所有仓位的市值之后统一计算，因为分母是全部仓位市值之和。
 * 市值为 null 的仓位（价格未知）按 0 处理，不计入总资产，也不参与百分比。
 */
export function computePercentOfTotal(positions: EnrichedPosition[]): EnrichedPosition[] {
  const totalMarketValue = positions.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);

  if (totalMarketValue === 0) {
    return positions.map((p) => ({ ...p, percentOfTotal: 0 }));
  }

  return positions.map((p) => ({
    ...p,
    percentOfTotal: p.marketValue !== null ? (p.marketValue / totalMarketValue) * 100 : 0,
  }));
}

/**
 * 汇总统计：给总览页面用的整体投资组合指标
 */
export interface PortfolioSummary {
  totalMarketValue: number;
  totalCostValue: number;
  totalPnlAmount: number;
  totalPnlPercent: number;
  positionCount: number;
}

export function computePortfolioSummary(positions: EnrichedPosition[]): PortfolioSummary {
  const totalMarketValue = positions.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);
  const totalCostValue = positions.reduce((sum, p) => sum + p.costValue, 0);
  const totalPnlAmount = totalMarketValue - totalCostValue;
  const totalPnlPercent = totalCostValue !== 0 ? (totalPnlAmount / totalCostValue) * 100 : 0;

  return {
    totalMarketValue,
    totalCostValue,
    totalPnlAmount,
    totalPnlPercent,
    positionCount: positions.length,
  };
}

/**
 * 按平台分组汇总（用于"总览"页面的多平台汇总视图）
 */
export interface PlatformSummary {
  platform: string;
  totalMarketValue: number;
  totalCostValue: number;
  totalPnlAmount: number;
  totalPnlPercent: number;
  positionCount: number;
}

export function groupByPlatform(positions: EnrichedPosition[]): PlatformSummary[] {
  const map = new Map<string, EnrichedPosition[]>();

  for (const p of positions) {
    const key = p.platform || '未分类';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  return Array.from(map.entries())
    .map(([platform, list]) => {
      const summary = computePortfolioSummary(list);
      return {
        platform,
        totalMarketValue: summary.totalMarketValue,
        totalCostValue: summary.totalCostValue,
        totalPnlAmount: summary.totalPnlAmount,
        totalPnlPercent: summary.totalPnlPercent,
        positionCount: summary.positionCount,
      };
    })
    .sort((a, b) => b.totalMarketValue - a.totalMarketValue);
}

/**
 * 按资产类型分组汇总（股票 vs 加密货币），用于总览页面的资产配置饼图
 */
export function groupByAssetType(positions: EnrichedPosition[]): {
  stock: PortfolioSummary;
  crypto: PortfolioSummary;
} {
  const stocks = positions.filter((p) => p.assetType === 'stock');
  const cryptos = positions.filter((p) => p.assetType === 'crypto');
  return {
    stock: computePortfolioSummary(stocks),
    crypto: computePortfolioSummary(cryptos),
  };
}

/**
 * 按 symbol 聚合汇总（同一支股票/币种，不同平台/不同仓位合并成一条）
 * 用于"仓位聚合"页面：把 NVDA·IBKR、NVDA·BITGET、NVDA·BITGET 等
 * 合并展示为一条 NVDA 汇总记录。
 */
export interface AggregatedPosition {
  symbol: string;
  assetType: Position['assetType'];
  /** 合并后的总持仓数量 */
  totalQuantity: number;
  /** 加权平均成本价 = 总成本 / 总数量 */
  avgCostPrice: number;
  totalCostValue: number;
  /** 只要有一笔价格未知，整条聚合就是 null（避免市值被低估） */
  totalMarketValue: number | null;
  totalPnlAmount: number | null;
  totalPnlPercent: number | null;
  percentOfTotal: number;
  /** 涉及的平台列表（去重） */
  platforms: string[];
  /** 合并了多少笔原始仓位 */
  lotCount: number;
  priceStatus: 'ok' | 'loading' | 'error';
}

export function groupBySymbol(positions: EnrichedPosition[]): AggregatedPosition[] {
  const map = new Map<string, EnrichedPosition[]>();

  for (const p of positions) {
    const key = p.symbol.toUpperCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }

  const totalMarketValueAll = positions.reduce((sum, p) => sum + (p.marketValue ?? 0), 0);

  const result: AggregatedPosition[] = Array.from(map.entries()).map(([symbol, list]) => {
    const totalQuantity = list.reduce((sum, p) => sum + p.quantity, 0);
    const totalCostValue = list.reduce((sum, p) => sum + p.costValue, 0);
    const avgCostPrice = totalQuantity !== 0 ? totalCostValue / totalQuantity : 0;

    const allPricesKnown = list.every((p) => p.marketValue !== null);
    const totalMarketValue = allPricesKnown
      ? list.reduce((sum, p) => sum + (p.marketValue ?? 0), 0)
      : null;

    const totalPnlAmount = totalMarketValue !== null ? totalMarketValue - totalCostValue : null;
    const totalPnlPercent =
      totalPnlAmount !== null && totalCostValue !== 0
        ? (totalPnlAmount / totalCostValue) * 100
        : null;

    const platforms = Array.from(new Set(list.map((p) => p.platform || '未分类')));

    const priceStatus: 'ok' | 'loading' | 'error' = list.some((p) => p.priceStatus === 'loading')
      ? 'loading'
      : list.every((p) => p.priceStatus === 'ok')
        ? 'ok'
        : 'error';

    return {
      symbol,
      assetType: list[0].assetType,
      totalQuantity,
      avgCostPrice,
      totalCostValue,
      totalMarketValue,
      totalPnlAmount,
      totalPnlPercent,
      percentOfTotal:
        totalMarketValueAll !== 0 && totalMarketValue !== null
          ? (totalMarketValue / totalMarketValueAll) * 100
          : 0,
      platforms,
      lotCount: list.length,
      priceStatus,
    };
  });

  return result.sort((a, b) => (b.totalMarketValue ?? 0) - (a.totalMarketValue ?? 0));
}


import type { ClosedPosition } from '@/types';

/**
 * 把一条"正在持有的仓位" + "卖出价格/时间" 转换成一条已了结记录，
 * 计算实现盈亏、持仓天数、年化收益率。
 */
export function buildClosedPosition(
  position: Position,
  exitPrice: number,
  closedAt: string
): Omit<ClosedPosition, 'id'> {
  const costValue = position.costPrice * position.quantity;
  const exitValue = exitPrice * position.quantity;
  const realizedPnlAmount = exitValue - costValue;
  const realizedPnlPercent = costValue !== 0 ? (realizedPnlAmount / costValue) * 100 : 0;

  const openedAt = position.createdAt;
  const holdingMs = new Date(closedAt).getTime() - new Date(openedAt).getTime();
  // 持仓不足 1 天时按 1 天计算，避免年化换算时除以 0 或产生离谱数字
  const holdingDays = Math.max(1, Math.round(holdingMs / (1000 * 60 * 60 * 24)));

  // 年化收益率（复利换算）：(1 + 总收益率)^(365/持仓天数) - 1
  const totalReturnRatio = costValue !== 0 ? exitValue / costValue : 1;
  const annualizedReturnPercent =
    totalReturnRatio > 0
      ? (Math.pow(totalReturnRatio, 365 / holdingDays) - 1) * 100
      : realizedPnlPercent; // 极端情况（本金亏光）直接退化成总收益率，避免 NaN

  return {
    symbol: position.symbol,
    assetType: position.assetType,
    costPrice: position.costPrice,
    exitPrice,
    quantity: position.quantity,
    platform: position.platform,
    openedAt,
    closedAt,
    realizedPnlAmount,
    realizedPnlPercent,
    holdingDays,
    annualizedReturnPercent,
    note: position.note,
  };
}