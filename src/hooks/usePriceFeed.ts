/**
 * ============================================================================
 * usePriceFeed —— 价格拉取与自动刷新 Hook
 * ============================================================================
 * 负责：
 *   1. 根据当前持有的仓位 symbol 列表，调用价格服务批量拉取最新报价
 *   2. 按 APP_CONFIG.priceRefreshIntervalMs 定时自动刷新
 *   3. 暴露 loading / error 状态，以及手动触发刷新的方法
 *
 * 不负责：
 *   - 仓位数据本身的增删改（那是 usePositionStore 的职责）
 *   - 盈亏等计算逻辑（那是 utils/calculations.ts 的职责）
 * 这样每个模块只做一件事，改起来互不影响。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Position, PriceQuote } from '@/types';
import { fetchAllQuotes } from '@/services/pricing';
import { APP_CONFIG } from '@/config/app';

export type PriceFeedStatus = 'idle' | 'loading' | 'success' | 'error';

interface UsePriceFeedResult {
  /** symbol -> 最新报价 的映射表 */
  quotes: Map<string, PriceQuote>;
  /** 当前拉取状态 */
  status: PriceFeedStatus;
  /** 最近一次成功刷新的时间 */
  lastUpdatedAt: string | null;
  /** 手动触发一次刷新 */
  refresh: () => void;
}

/**
 * @param positions 当前全部仓位，用于确定要拉取哪些 symbol 的价格
 */
export function usePriceFeed(positions: Position[]): UsePriceFeedResult {
  const [quotes, setQuotes] = useState<Map<string, PriceQuote>>(new Map());
  const [status, setStatus] = useState<PriceFeedStatus>('idle');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // 用 ref 存最新的 positions，避免定时器闭包拿到旧数据，同时不需要把
  // positions 放进 useEffect 依赖数组（那样每次仓位变化都会重置定时器）
  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const refresh = useCallback(async () => {
    const currentPositions = positionsRef.current;
    if (currentPositions.length === 0) {
      setQuotes(new Map());
      setStatus('success');
      return;
    }

    setStatus('loading');
    try {
      const newQuotes = await fetchAllQuotes(currentPositions);
      setQuotes(newQuotes);
      setStatus('success');
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error('[usePriceFeed] 刷新价格失败:', err);
      setStatus('error');
    }
  }, []);

  // 首次加载 + symbol 列表变化时刷新
  // 用 symbol 列表的字符串形式做依赖，避免 positions 数组引用变化（比如只改了备注）
  // 也触发不必要的价格请求
  const symbolKey = positions.map((p) => `${p.assetType}:${p.symbol}`).sort().join(',');

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey]);

  // 定时自动刷新
  useEffect(() => {
    if (APP_CONFIG.priceRefreshIntervalMs <= 0) return;
    const timer = setInterval(() => {
      refresh();
    }, APP_CONFIG.priceRefreshIntervalMs);
    return () => clearInterval(timer);
  }, [refresh]);

  return { quotes, status, lastUpdatedAt, refresh };
}
