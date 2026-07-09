/**
 * ============================================================================
 * 价格服务统一入口
 * ============================================================================
 * 上层代码（hooks/usePriceFeed.ts）只需要调用这里的 fetchAllQuotes()，
 * 不需要关心股票走 Alpaca、加密货币走 CoinGecko 这些细节。
 * 以后想给某个资产类型换数据源，只改这个文件里的路由逻辑即可。
 */
import type { Position, PriceQuote, AssetType } from '@/types';
import { finnhubProvider } from './finnhubProvider';
import { coingeckoProvider } from './coingeckoProvider';
import type { PriceProvider } from './types';

/** 资产类型 -> 数据源 的路由表。想换数据源只改这里。 */
const PROVIDER_MAP: Record<AssetType, PriceProvider> = {
  stock: finnhubProvider,
  crypto: coingeckoProvider,
};

/**
 * 根据一批仓位，按资产类型分组后分别请求对应数据源，最终合并成一个
 * Map<symbol, PriceQuote> 返回。
 */
export async function fetchAllQuotes(positions: Position[]): Promise<Map<string, PriceQuote>> {
  // 按资产类型分组去重 symbol，避免同一个 symbol 出现在多个仓位里时重复请求
  const symbolsByType: Record<AssetType, Set<string>> = {
    stock: new Set(),
    crypto: new Set(),
  };

  for (const p of positions) {
    symbolsByType[p.assetType].add(p.symbol.toUpperCase());
  }

  const entries = Object.entries(symbolsByType) as [AssetType, Set<string>][];

  const results = await Promise.all(
    entries.map(([assetType, symbolSet]) =>
      PROVIDER_MAP[assetType].fetchQuotes(Array.from(symbolSet))
    )
  );

  const merged = new Map<string, PriceQuote>();
  for (const quoteMap of results) {
    for (const [symbol, quote] of quoteMap.entries()) {
      merged.set(symbol, quote);
    }
  }

  return merged;
}

export { finnhubProvider, coingeckoProvider };
export type { PriceProvider };
