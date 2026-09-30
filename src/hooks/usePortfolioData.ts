/**
 * ============================================================================
 * usePortfolioData —— 组合 Hook
 * ============================================================================
 * 这是 UI 组件应该优先使用的 hook：它把三层东西组合成一个"随取随用"的结果：
 *   1. usePositionStore  —— 原始仓位数据
 *   2. usePriceFeed       —— 实时价格
 *   3. utils/calculations —— 计算盈亏、市值、占比
 *
 * 组件不需要自己去分别调用 store/hook/计算函数再手动拼接，
 * 直接 const { enrichedPositions, summary } = usePortfolioData() 就能拿到
 * 展示所需的一切数据。
 */
import { useMemo } from 'react';
import { usePositionStore } from '@/store/usePositionStore';
import { useCashStore } from '@/store/useCashStore';
import { usePriceFeed } from './usePriceFeed';
import {
  enrichPosition,
  computePercentOfTotal,
  computePortfolioSummary,
  groupByPlatform,
  groupByAssetType,
  groupBySymbol,
  groupPositionsByPlatform,
} from '@/utils/calculations';
import type { EnrichedPosition } from '@/types';

export function usePortfolioData() {
  const positions = usePositionStore((s) => s.positions);
  const cashAccounts = useCashStore((s) => s.accounts);
  const { quotes, status, lastUpdatedAt, refresh } = usePriceFeed(positions);

  const enrichedPositions: EnrichedPosition[] = useMemo(() => {
    const priceStatus = status === 'loading' ? 'loading' : status === 'error' ? 'error' : 'ok';
    const enriched = positions.map((p) => {
      const quote = quotes.get(p.symbol.toUpperCase());
      const individualStatus = quote ? 'ok' : priceStatus === 'loading' ? 'loading' : 'error';
      return enrichPosition(p, quote, individualStatus);
    });
    return computePercentOfTotal(enriched);
  }, [positions, quotes, status]);

  const investmentSummary = useMemo(() => computePortfolioSummary(enrichedPositions), [enrichedPositions]);
  const cashValue = useMemo(
    () => cashAccounts.reduce((sum, account) => sum + account.balance, 0),
    [cashAccounts]
  );
  const summary = useMemo(() => ({
    ...investmentSummary,
    investmentValue: investmentSummary.totalMarketValue,
    cashValue,
    totalAssets: investmentSummary.totalMarketValue + cashValue,
  }), [investmentSummary, cashValue]);

  const platformSummaries = useMemo(
    () => groupByPlatform(enrichedPositions),
    [enrichedPositions]
  );

  const assetTypeSummary = useMemo(
    () => groupByAssetType(enrichedPositions),
    [enrichedPositions]
  );

  const aggregatedPositions = useMemo(
    () => groupBySymbol(enrichedPositions),
    [enrichedPositions]
  );

  const positionsByPlatform = useMemo(
    () => groupPositionsByPlatform(enrichedPositions),
    [enrichedPositions]
  );

  return {
    /** 每条仓位的完整视图数据（含市值/盈亏/占比） */
    enrichedPositions,
    /** 整体投资组合汇总（总市值/总盈亏等） */
    summary,
    /** 按平台分组的汇总（总览页面用） */
    platformSummaries,
    /** 按资产类型（股票/加密）分组的汇总 */
    assetTypeSummary,
    /** 按 symbol 聚合后的仓位（仓位聚合页面用） */
    aggregatedPositions,
    /** 按平台反向分组的仓位（仓位聚合页面用） */
    positionsByPlatform,
    cashAccounts,
    /** 价格拉取状态 */
    priceStatus: status,
    /** 最近一次价格刷新时间 */
    lastUpdatedAt,
    /** 手动刷新价格 */
    refreshPrices: refresh,
  };
}
