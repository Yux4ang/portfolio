/**
 * ============================================================================
 * 价格数据源的统一接口
 * ============================================================================
 * 无论底层用的是 Alpaca 还是 CoinGecko，还是以后新增的其他数据源
 * （比如 Finnhub、雪球等），只要实现这个接口，上层代码（usePriceFeed hook）
 * 完全不用改。这是"策略模式"，方便以后替换/新增数据源。
 */
import type { PriceQuote } from '@/types';

export interface PriceProvider {
  /** 数据源标识 */
  readonly name: 'alpaca' | 'coingecko';
  /**
   * 批量获取报价。
   * @param symbols 代码列表（大写，例如 ['AAPL', 'TSLA']）
   * @returns Map<symbol, PriceQuote>，拉取失败的 symbol 不会出现在返回结果里，
   *          调用方需要自行判断哪些 symbol 缺失了报价。
   */
  fetchQuotes(symbols: string[]): Promise<Map<string, PriceQuote>>;
}
