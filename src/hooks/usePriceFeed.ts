/**
 * ============================================================================
 * usePriceFeed —— 价格拉取与自动刷新 Hook
 * ============================================================================
 * 负责：
 *   1. 根据当前持有的仓位 symbol 列表，调用价格服务批量拉取最新报价
 *   2. 按 APP_CONFIG.priceRefreshIntervalMs 定时自动刷新
 *   3. 暴露 loading / error 状态，以及手动触发刷新的方法
 *
 * 【已知问题修复】之前没有防止"上一轮刷新还没跑完，下一轮又被触发"的机制。
 * 一旦某个 symbol 被限流进入重试等待，整批刷新耗时变长，如果这时候定时器
 * 或手动点击又触发了新一轮刷新，会导致同一批 symbol 被重复请求，
 * 越滚越大形成限流雪球。这里用 isRefreshingRef 加一把锁，
 * 刷新进行中时忽略新的刷新请求。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Position, PriceQuote } from '@/types';
import { fetchAllQuotes } from '@/services/pricing';
import { APP_CONFIG } from '@/config/app';

export type PriceFeedStatus = 'idle' | 'loading' | 'success' | 'error';

interface UsePriceFeedResult {
  quotes: Map<string, PriceQuote>;
  status: PriceFeedStatus;
  lastUpdatedAt: string | null;
  refresh: () => void;
}

export function usePriceFeed(positions: Position[]): UsePriceFeedResult {
  const [quotes, setQuotes] = useState<Map<string, PriceQuote>>(new Map());
  const [status, setStatus] = useState<PriceFeedStatus>('idle');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  // 防止刷新请求重叠：true 表示当前有一轮刷新正在进行中
  const isRefreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      // 已经有一轮刷新在跑，忽略这次触发，避免同一批 symbol 被重复请求
      console.warn('[usePriceFeed] 上一轮刷新还未完成，跳过本次触发');
      return;
    }

    const currentPositions = positionsRef.current;
    if (currentPositions.length === 0) {
      setQuotes(new Map());
      setStatus('success');
      return;
    }

    isRefreshingRef.current = true;
    setStatus('loading');
    try {
      const newQuotes = await fetchAllQuotes(currentPositions);
      setQuotes(newQuotes);
      setStatus('success');
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error('[usePriceFeed] 刷新价格失败:', err);
      setStatus('error');
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const symbolKey = positions.map((p) => `${p.assetType}:${p.symbol}`).sort().join(',');
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey]);

  useEffect(() => {
    if (APP_CONFIG.priceRefreshIntervalMs <= 0) return;
    const timer = setInterval(() => {
      refresh();
    }, APP_CONFIG.priceRefreshIntervalMs);
    return () => clearInterval(timer);
  }, [refresh]);

  return { quotes, status, lastUpdatedAt, refresh };
}