/**
 * ============================================================================
 * usePriceFeed —— 价格拉取与自动刷新 Hook
 * ============================================================================
 * 【2026-07 重新设计】不再是"每隔固定时间把全部标的一起刷新一遍"，
 * 而是每隔 tickIntervalMs 检查一次，只挑出"已经过期"的标的去请求：
 *   - 已成功拿到价格的标的：超过 successRefreshIntervalMs（5分钟）才算过期
 *   - 上次请求失败（比如被 429 限流）的标的：超过 failureRetryIntervalMs（90秒）才允许重试
 * 这样能大幅减少总请求量，尤其是持仓数量多、免费 API 额度紧张的情况下。
 *
 * 手动点击刷新按钮（refresh()）会强制刷新全部标的，忽略过期判断——
 * 用户主动要求刷新时不应该被"还没过期"挡住。
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Position, PriceQuote } from '@/types';
import { fetchAllQuotes } from '@/services/pricing';
import { APP_CONFIG } from '@/config/app';

export type PriceFeedStatus = 'idle' | 'loading' | 'success' | 'error';

interface SymbolMeta {
  status: 'ok' | 'error';
  lastAttemptAt: number;
  lastSuccessAt: number | null;
}

interface UsePriceFeedResult {
  quotes: Map<string, PriceQuote>;
  status: PriceFeedStatus;
  lastUpdatedAt: string | null;
  refresh: () => void;
}

function symbolKeyOf(p: Position): string {
  return `${p.assetType}:${p.symbol.toUpperCase()}`;
}

export function usePriceFeed(positions: Position[]): UsePriceFeedResult {
  const [quotes, setQuotes] = useState<Map<string, PriceQuote>>(new Map());
  const [status, setStatus] = useState<PriceFeedStatus>('idle');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  /** 每个 symbol 的"新鲜度"元数据，不触发渲染，纯内部记录 */
  const metaRef = useRef<Map<string, SymbolMeta>>(new Map());
  const isRefreshingRef = useRef(false);

  const runRefresh = useCallback(async (forceAll: boolean) => {
    if (isRefreshingRef.current) {
      console.warn('[usePriceFeed] 上一轮刷新还未完成，跳过本次触发');
      return;
    }

    const currentPositions = positionsRef.current;
    if (currentPositions.length === 0) {
      setQuotes(new Map());
      setStatus('success');
      return;
    }

    const now = Date.now();
    const targets = forceAll
      ? currentPositions
      : currentPositions.filter((p) => {
          const meta = metaRef.current.get(symbolKeyOf(p));
          if (!meta) return true; // 从没拉取过，肯定需要刷新
          if (meta.status === 'error') {
            return now - meta.lastAttemptAt >= APP_CONFIG.failureRetryIntervalMs;
          }
          return now - (meta.lastSuccessAt ?? 0) >= APP_CONFIG.successRefreshIntervalMs;
        });

    if (targets.length === 0) {
      // 本轮检查下来，没有标的过期，什么都不用做
      return;
    }

    isRefreshingRef.current = true;
    setStatus('loading');
    try {
      const newQuotes = await fetchAllQuotes(targets);
      const attemptTime = Date.now();

      setQuotes((prev) => {
        const merged = new Map(prev);
        for (const target of targets) {
          const key = symbolKeyOf(target);
          const upperSymbol = target.symbol.toUpperCase();
          const quote = newQuotes.get(upperSymbol);
          if (quote) {
            merged.set(upperSymbol, quote);
            metaRef.current.set(key, {
              status: 'ok',
              lastAttemptAt: attemptTime,
              lastSuccessAt: attemptTime,
            });
          } else {
            // 请求失败：保留旧的报价（如果有）继续展示，只标记本次尝试失败
            metaRef.current.set(key, {
              status: 'error',
              lastAttemptAt: attemptTime,
              lastSuccessAt: metaRef.current.get(key)?.lastSuccessAt ?? null,
            });
          }
        }
        return merged;
      });

      setStatus('success');
      setLastUpdatedAt(new Date().toISOString());
    } catch (err) {
      console.error('[usePriceFeed] 刷新价格失败:', err);
      setStatus('error');
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  /** 手动刷新：强制刷新全部标的，忽略"是否过期"的判断 */
  const refresh = useCallback(() => {
    runRefresh(true);
  }, [runRefresh]);

  // 首次加载 + 持仓列表变化时，强制全量拉取一次
  const symbolKey = positions.map((p) => symbolKeyOf(p)).sort().join(',');
  useEffect(() => {
    runRefresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey]);

  // 定时检查：只刷新已过期的标的
  useEffect(() => {
    const timer = setInterval(() => {
      runRefresh(false);
    }, APP_CONFIG.tickIntervalMs);
    return () => clearInterval(timer);
  }, [runRefresh]);

  return { quotes, status, lastUpdatedAt, refresh };
}