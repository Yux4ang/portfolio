/**
 * ============================================================================
 * Finnhub 股票价格提供者
 * ============================================================================
 * Finnhub 免费版没有批量报价接口，需要每个 symbol 单独请求一次。
 * 【已知问题】如果一次性并发发起太多请求（比如同时 13 个），偶尔会被
 * Finnhub/Cloudflare 边缘节点判定为异常流量而返回非 JSON 响应，
 * 导致代理报 502。这里把请求限制成小批次（每批 4 个），批次间隔 250ms，
 * 避免瞬时并发过高。
 */
import type { PriceProvider } from './types';
import type { PriceQuote } from '@/types';

const PROXY_BASE_URL = import.meta.env.VITE_PRICE_PROXY_BASE_URL || '/api/proxy';
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 400;

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOne(symbol: string, retryCount = 0): Promise<PriceQuote | null> {
  try {
    const url = `${PROXY_BASE_URL}/finnhub/quote?symbol=${encodeURIComponent(symbol)}`;
    const res = await fetch(url);

    if (res.status === 429 && retryCount < 2) {
      // 被限流：等待一段时间后重试（重试次数越多，等待越久）
      const waitMs = 1500 * (retryCount + 1);
      await sleep(waitMs);
      return fetchOne(symbol, retryCount + 1);
    }

    if (!res.ok) {
      console.error(`[finnhubProvider] 请求失败: ${symbol} ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (typeof data?.c === 'number' && data.c > 0) {
      return {
        symbol,
        price: data.c,
        source: 'finnhub',
        fetchedAt: new Date().toISOString(),
        dayChangePercent: typeof data.dp === 'number' ? data.dp : undefined,
      };
    }
    return null;
  } catch (err) {
    console.error(`[finnhubProvider] 请求异常: ${symbol}`, err);
    return null;
  }
}

export const finnhubProvider: PriceProvider = {
  name: 'finnhub',
  async fetchQuotes(symbols: string[]): Promise<Map<string, PriceQuote>> {
    const result = new Map<string, PriceQuote>();
    if (symbols.length === 0) return result;

    const batches = chunk(symbols, BATCH_SIZE);

    for (const batch of batches) {
      const quotes = await Promise.all(batch.map((symbol) => fetchOne(symbol)));
      quotes.forEach((quote, i) => {
        if (quote) result.set(batch[i], quote);
      });
      // 批次之间稍微等一下，避免瞬时并发过高
      await sleep(BATCH_DELAY_MS);
    }

    return result;
  },
};